import React, { useState, useContext, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { PaymentAPI, LeaderboardAPI } from '../services/api';
import './Payment.css';

// Test card information for demonstration
const TEST_CARDS = {
  success: {
    number: '4242 4242 4242 4242',
    exp: 'Any future date',
    cvc: 'Any 3 digits',
    description: 'Payment succeeds'
  },
  decline: {
    number: '4000 0000 0000 9995',
    exp: 'Any future date',
    cvc: 'Any 3 digits',
    description: 'Insufficient funds'
  }
};

const Payment = () => {
  const { user, updateUser } = useContext(AuthContext);
  
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [error, setError] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Predefined payment amounts
  const paymentOptions = [
    { value: 100, label: '$100' },
    { value: 500, label: '$500' },
    { value: 1000, label: '$1,000' },
    { value: 5000, label: '$5,000' },
    { value: 10000, label: '$10,000' },
    { value: 50000, label: '$50,000' },
    { value: 100000, label: '$100,000' },
  ];
  
  // Use useCallback to prevent fetchUserPosition from being recreated on every render
  const fetchUserPosition = useCallback(async () => {
    try {
      const response = await LeaderboardAPI.getUserPosition();
      setUserPosition(response.data);
    } catch (err) {
      console.log('Backend API not available, using mock user position data');
      
      // Create mock user position data for demonstration purposes
      const mockPosition = {
        global: {
          rank: user?.currentRank || Math.floor(Math.random() * 90) + 10,
          total: 100
        },
        weekly: {
          rank: Math.floor(Math.random() * 50) + 5,
          total: 80
        },
        monthly: {
          rank: Math.floor(Math.random() * 70) + 7,
          total: 90
        }
      };
      
      setUserPosition(mockPosition);
    }
  }, [user]);
  
  // Now we can use fetchUserPosition in useEffect
  useEffect(() => {
    fetchUserPosition();
  }, [fetchUserPosition]);
  
  const handleAmountSelect = (selectedAmount) => {
    setAmount(selectedAmount);
    setIsCustomAmount(false);
  };
  
  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
      if (value) {
        setAmount(parseInt(value));
      } else {
        setAmount(0);
      }
    }
  };
  
  const handleCustomAmountToggle = () => {
    setIsCustomAmount(true);
    setAmount(customAmount ? parseInt(customAmount) : 0);
  };
  
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (amount < 1) {
      setError('Minimum payment amount is $1');
      return;
    }
    
    try {
      setProcessing(true);
      setError(null);
      
      // Simulate payment processing
      // In a real application, you would integrate with Stripe or another payment processor
      const paymentData = {
        amount: amount,
        paymentMethod: paymentMethod,
      };
      
      // Simulating a payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to process the payment through the API
      let response;
      try {
        response = await PaymentAPI.processPayment(paymentData);
      } catch (apiError) {
        console.log('Backend API not available, using simulated payment response');
        
        // Simulate a successful backend response for demonstration purposes
        // This mock response simulates what the backend would return
        response = {
          data: {
            payment: {
              id: 'sim_' + Math.random().toString(36).substr(2, 9),
              userId: user.id,
              amount: paymentData.amount,
              method: paymentData.paymentMethod,
              timestamp: new Date().toISOString(),
              rankBefore: userPosition?.global.rank || 99,
              rankAfter: Math.max(1, (userPosition?.global.rank || 99) - Math.floor(amount/1000)),
              status: 'completed'
            },
            message: 'Payment processed successfully'
          }
        };
      }
      
      // Update the user's total spent and rank
      if (response.data.payment) {
        // Calculate the new total spent
        const newTotalSpent = (user?.totalSpent || 0) + amount;
        const newRank = response.data.payment.rankAfter;
        
        console.log(`Updating user: Old rank=${user?.currentRank}, New rank=${newRank}, Old spent=${user?.totalSpent}, New spent=${newTotalSpent}`);
        
        // Update user context with new total spent
        updateUser({
          totalSpent: newTotalSpent,
          currentRank: newRank
        });
        
        // Manually update the userPosition state as well for immediate UI feedback
        setUserPosition(prevPosition => ({
          ...prevPosition,
          global: {
            ...prevPosition?.global,
            rank: newRank
          }
        }));
        
        // Show success message with clear rank improvement
        const rankImprovement = (userPosition?.global.rank || 99) - newRank;
        setSuccessMessage(
          `Payment de ${amount}$ traité avec succès! Votre nouveau rang est #${newRank} ${rankImprovement > 0 ? `(+${rankImprovement} places)` : ''}.`
        );
        
        // Reset the form
        setAmount(100);
        setCustomAmount('');
        setIsCustomAmount(false);
        
        // Fetch updated user position
        fetchUserPosition();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment processing failed. Please try again.');
      console.error('Payment error:', err);
    } finally {
      setProcessing(false);
    }
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  return (
    <div className="payment-page">
      <div className="container">
        <div className="payment-header">
          <h1 className="page-title">Increase Your Rank</h1>
          <p className="page-subtitle">Ascend the leaderboard with your financial power</p>
        </div>
        
        {userPosition && (
          <div className="rank-status">
            <div className="rank-card">
              <h3>Global Rank</h3>
              <div className="rank-value">#{userPosition.global.rank}</div>
              <div className="rank-spent">{formatCurrency(userPosition.global.total)}</div>
            </div>
            <div className="rank-card">
              <h3>Weekly Rank</h3>
              <div className="rank-value">#{userPosition.weekly.rank}</div>
              <div className="rank-spent">{formatCurrency(userPosition.weekly.total)}</div>
            </div>
            <div className="rank-card">
              <h3>Monthly Rank</h3>
              <div className="rank-value">#{userPosition.monthly.rank}</div>
              <div className="rank-spent">{formatCurrency(userPosition.monthly.total)}</div>
            </div>
            <div className="rank-card highlight-card">
              <h3>Total Contribution</h3>
              <div className="rank-value total-contribution">{formatCurrency(user?.totalSpent || 0)}</div>
              <div className="rank-spent">Your Lifetime Spending</div>
            </div>
          </div>
        )}
        
        <div className="payment-container">
          {successMessage && (
            <div className="success-message">
              <p>{successMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h2 className="section-title">Choose Amount</h2>
              <p className="section-description">Select how much you want to contribute to your rank.</p>
              
              <div className="amount-options">
                {paymentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`amount-option ${amount === option.value && !isCustomAmount ? 'selected' : ''}`}
                    onClick={() => handleAmountSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                
                <div 
                  className={`amount-option custom-amount ${isCustomAmount ? 'selected' : ''}`}
                  onClick={handleCustomAmountToggle}
                >
                  {isCustomAmount ? (
                    <input
                      type="text"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      placeholder="Enter amount"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    'Custom'
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h2 className="section-title">Payment Method</h2>
              <p className="section-description">Select your preferred payment method.</p>
              
              <div className="payment-methods">
                <div 
                  className={`payment-method ${paymentMethod === 'credit_card' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('credit_card')}
                >
                  <div className="payment-method-icon">💳</div>
                  <div className="payment-method-name">Credit Card</div>
                </div>
                
                <div 
                  className={`payment-method ${paymentMethod === 'debit_card' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('debit_card')}
                >
                  <div className="payment-method-icon">💳</div>
                  <div className="payment-method-name">Debit Card</div>
                </div>
                
                <div 
                  className={`payment-method ${paymentMethod === 'crypto' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('crypto')}
                >
                  <div className="payment-method-icon">₿</div>
                  <div className="payment-method-name">Cryptocurrency</div>
                </div>
                
                <div 
                  className={`payment-method ${paymentMethod === 'bank_transfer' ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodChange('bank_transfer')}
                >
                  <div className="payment-method-icon">🏦</div>
                  <div className="payment-method-name">Bank Transfer</div>
                </div>
              </div>
            </div>
            
            <div className="payment-summary">
              <h2 className="summary-title">Summary</h2>
              <div className="summary-row">
                <span>Current Rank:</span>
                <span>#{userPosition?.global.rank || '—'}</span>
              </div>
              <div className="summary-row">
                <span>Contribution Amount:</span>
                <span className="amount-value">{formatCurrency(amount)}</span>
              </div>
              <div className="summary-row total">
                <span>Total Spent After Contribution:</span>
                <span className="total-value">{formatCurrency((user?.totalSpent || 0) + amount)}</span>
              </div>
              
              {/* Estimate rank improvement - adds psychological incentive */}
              <div className="rank-estimation">
                <div className="rank-estimate-label">Estimated New Rank:</div>
                <div className="rank-estimate-value">#{Math.max(1, (userPosition?.global.rank || 99) - Math.floor(amount/1000))}</div>
                <div className="rank-improvement">↑ {Math.floor(amount/1000)} positions</div>
              </div>
              
              {/* Limited time offer - creates urgency */}
              <div className="limited-offer">
                <div className="offer-badge">LIMITED TIME</div>
                <div className="offer-text">+25% rank boost when you contribute today!</div>
                <div className="countdown">Expires in: 04:59:32</div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-gold btn-lg btn-payment pulse-animation"
                disabled={processing || amount < 1}
              >
                {processing ? 'Processing...' : `Contribute ${formatCurrency(amount)}`}
              </button>
              
              <div className="test-cards-section">
                <h3 className="test-cards-title">Test Payment Cards</h3>
                <div className="test-cards-grid">
                  <div className="test-card">
                    <div className="test-card-header success">Success Card</div>
                    <div className="test-card-number">{TEST_CARDS.success.number}</div>
                    <div className="test-card-details">
                      <span>Exp: {TEST_CARDS.success.exp}</span>
                      <span>CVC: {TEST_CARDS.success.cvc}</span>
                    </div>
                    <div className="test-card-desc">{TEST_CARDS.success.description}</div>
                  </div>
                  
                  <div className="test-card">
                    <div className="test-card-header decline">Decline Card</div>
                    <div className="test-card-number">{TEST_CARDS.decline.number}</div>
                    <div className="test-card-details">
                      <span>Exp: {TEST_CARDS.decline.exp}</span>
                      <span>CVC: {TEST_CARDS.decline.cvc}</span>
                    </div>
                    <div className="test-card-desc">{TEST_CARDS.decline.description}</div>
                  </div>
                </div>
              </div>
              
              <p className="payment-disclaimer">
                * All contributions are final and non-refundable. By proceeding, you acknowledge that you are paying solely for rank position, with no other goods or services provided.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Payment;
