const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CHF']
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'crypto', 'bank_transfer'],
    required: true
  },
  stripePaymentId: {
    type: String
  },
  cryptoTransactionId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  rankBefore: {
    type: Number
  },
  rankAfter: {
    type: Number
  },
  description: {
    type: String,
    default: 'OneRun rank payment'
  }
}, {
  timestamps: true
});

// Index for faster querying by date ranges (for weekly/monthly leaderboards)
PaymentSchema.index({ createdAt: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;
