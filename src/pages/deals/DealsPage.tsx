import React, { useState, useEffect } from 'react';
import { Search, Filter, DollarSign, TrendingUp, Users, Calendar, ArrowRightLeft, History, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../../components/deals/StripePaymentForm';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Load stripe client sandbox fallback key
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51Pq3yG2LocE13f7acXbBvM6w00oG2K89Tsk9i4dD8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F8F'
);



export const DealsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'wallet'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  // Forms
  const [depositAmount, setDepositAmount] = useState('100');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const statuses = ['Due Diligence', 'Term Sheet', 'Negotiation', 'Closed', 'Passed'];

  const loadTransactions = () => {
    API.get('/payments/transactions')
      .then(({ data }) => {
        setTransactions(data.transactions);
        // Calculate balance (deposits/transfers received - transfers sent)
        let total = 0;
        data.transactions.forEach((tx: any) => {
          if (tx.status === 'completed') {
            if (tx.type === 'deposit') {
              total += tx.amount;
            } else if (tx.type === 'transfer') {
              total -= tx.amount;
            }
          }
        });
        setBalance(total);
      })
      .catch((err) => console.error('Error fetching transactions:', err));
  };

  const loadDeals = () => {
    setLoading(true);
    API.get('/collaborations')
      .then(({ data }) => {
        const mappedDeals = data.requests.map((r: any) => {
          const startupName = r.entrepreneurId?.startupName || 'NextGen Tech';
          const logo = r.entrepreneurId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(startupName)}&background=random`;
          const industry = r.entrepreneurId?.industry || 'Tech';
          
          let amount = '$1.5M';
          let equity = '15%';
          if (r.dealTerms) {
            const parts = r.dealTerms.split(',');
            if (parts[0]) amount = parts[0].trim();
            if (parts[1]) equity = parts[1].trim();
          }
          
          let status = 'Due Diligence';
          if (r.status === 'accepted') status = 'Closed';
          else if (r.status === 'rejected') status = 'Passed';
          else status = 'Negotiation';
          
          return {
            id: r.id || r._id,
            startup: { name: startupName, logo, industry },
            amount,
            equity,
            status,
            stage: r.entrepreneurId?.fundingStage || 'Seed',
            lastActivity: r.updatedAt || r.createdAt
          };
        });
        setDeals(mappedDeals);
      })
      .catch((err) => console.error('Error fetching deals:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadDeals();
    }
  }, [user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferRecipient || !transferAmount) {
      toast.error('Please enter recipient ID and amount');
      return;
    }

    setIsTransferring(true);
    try {
      await API.post('/payments/transfer', {
        recipientId: transferRecipient,
        amount: Number(transferAmount),
        description: transferDesc
      });
      toast.success('Funds transferred successfully!');
      setTransferRecipient('');
      setTransferAmount('');
      setTransferDesc('');
      loadTransactions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Due Diligence': return 'primary';
      case 'Term Sheet': return 'secondary';
      case 'Negotiation': return 'accent';
      case 'Closed': return 'success';
      case 'Passed': return 'error';
      default: return 'gray';
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchQuery === '' || 
      deal.startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.startup.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(deal.status);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Deals & Wallet</h1>
          <p className="text-gray-600">Track your investment pipeline and manage wallet balances</p>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'pipeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'wallet' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Wallet & Wallet Log
          </button>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Pipeline Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="p-3 bg-primary-100 rounded-lg mr-3">
                    <DollarSign size={20} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Investment</p>
                    <p className="text-lg font-semibold text-gray-900">$4.3M</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="p-3 bg-secondary-100 rounded-lg mr-3">
                    <TrendingUp size={20} className="text-secondary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Deals</p>
                    <p className="text-lg font-semibold text-gray-900">{filteredDeals.length}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="p-3 bg-accent-100 rounded-lg mr-3">
                    <Users size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Portfolio Companies</p>
                    <p className="text-lg font-semibold text-gray-900">12</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="p-3 bg-success-100 rounded-lg mr-3">
                    <Calendar size={20} className="text-success-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Closed This Month</p>
                    <p className="text-lg font-semibold text-gray-900">2</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-2/3">
              <Input
                placeholder="Search deals by startup name or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startAdornment={<Search size={18} />}
                fullWidth
              />
            </div>
            <div className="w-full md:w-1/3 flex items-center">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-500" />
                <div className="flex flex-wrap gap-2">
                  {statuses.map(status => (
                    <Badge
                      key={status}
                      variant={selectedStatus.includes(status) ? getStatusColor(status) : 'gray'}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(status)}
                    >
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Deals list */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Active Deals</h2>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDeals.length > 0 ? (
                      filteredDeals.map(deal => (
                        <tr key={deal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Avatar src={deal.startup.logo} alt={deal.startup.name} size="sm" className="flex-shrink-0" />
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{deal.startup.name}</div>
                                <div className="text-sm text-gray-500">{deal.startup.industry}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.equity}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={getStatusColor(deal.status)}>{deal.status}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.stage}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(deal.lastActivity).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No active deals found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          {/* Wallet Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {/* Wallet card info */}
              <Card className="bg-primary-50 border border-primary-100">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-primary-700 font-medium">Available Balance</p>
                      <h2 className="text-3xl font-extrabold text-primary-950 mt-1">${balance.toLocaleString()}</h2>
                    </div>
                    <div className="p-3 bg-primary-100 rounded-full">
                      <DollarSign size={24} className="text-primary-700" />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Deposit Card Form */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium text-gray-900">Deposit Funds</h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount ($)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      fullWidth
                    />
                  </div>
                  <Elements stripe={stripePromise}>
                    <StripePaymentForm amount={Number(depositAmount) || 0} onSuccess={loadTransactions} />
                  </Elements>
                </CardBody>
              </Card>
            </div>

            {/* Transfer & History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Transfer Funds form */}
              <Card>
                <CardHeader className="flex items-center gap-2">
                  <ArrowRightLeft className="text-primary-600" size={20} />
                  <h3 className="text-lg font-medium text-gray-900">P2P Fund Transfer</h3>
                </CardHeader>
                <CardBody>
                  <form onSubmit={handleTransfer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Recipient User ID</label>
                        <Input
                          type="text"
                          placeholder="e.g. 660f..."
                          value={transferRecipient}
                          onChange={(e) => setTransferRecipient(e.target.value)}
                          fullWidth
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount ($)</label>
                        <Input
                          type="number"
                          placeholder="Amount to send"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</label>
                      <Input
                        type="text"
                        placeholder="Investment or share transfer memo..."
                        value={transferDesc}
                        onChange={(e) => setTransferDesc(e.target.value)}
                        fullWidth
                      />
                    </div>
                    <Button type="submit" variant="primary" disabled={isTransferring} fullWidth>
                      {isTransferring ? 'Processing Transfer...' : 'Send Transfer'}
                    </Button>
                  </form>
                </CardBody>
              </Card>

              {/* Transactions History */}
              <Card>
                <CardHeader className="flex items-center gap-2">
                  <History className="text-primary-600" size={20} />
                  <h3 className="text-lg font-medium text-gray-900">Wallet Logs</h3>
                </CardHeader>
                <CardBody>
                  {transactions.length > 0 ? (
                    <div className="divide-y divide-gray-100 max-h-[40vh] overflow-y-auto pr-2">
                      {transactions.map((tx) => (
                        <div key={tx._id || tx.id} className="flex justify-between items-center py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm capitalize text-gray-950">{tx.type}</span>
                              <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'gray' : 'error'} size="sm">
                                {tx.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{tx.description || 'Stripe Deposit'}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</p>
                          </div>
                          <span className={`font-bold text-sm ${
                            tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'deposit' ? '+' : '-'}${tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                        <AlertCircle size={20} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">No transaction logs available</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};