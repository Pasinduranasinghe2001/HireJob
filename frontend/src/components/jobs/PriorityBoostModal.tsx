import React, { useState } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { FiX, FiZap, FiCheckCircle, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface PriorityBoostModalProps {
  jobId: number;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PriorityBoostModal: React.FC<PriorityBoostModalProps> = ({
  jobId,
  jobTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [packageType, setPackageType] = useState<'7_DAYS_PRIORITY' | '30_DAYS_PRIORITY'>('7_DAYS_PRIORITY');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'PAYHERE' | 'BANK_TRANSFER'>('PAYHERE');
  const [loading, setLoading] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);

  if (!isOpen) return null;

  const amount = packageType === '7_DAYS_PRIORITY' ? 1500 : 3500;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/payments/priority-boost', {
        jobId,
        packageType,
        amount,
        paymentMethod,
      });

      setCompletedInvoice(res.data.data);
      toast.success('Boost activated! Your service is now pinned to the top.');
      onSuccess();
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
        >
          <FiX className="w-5 h-5" />
        </button>

        {completedInvoice ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Received!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your service <strong className="text-gray-800 dark:text-gray-200">"{jobTitle}"</strong> has been successfully boosted to the top of the marketplace.
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-left text-xs space-y-1.5 font-mono text-gray-600 dark:text-gray-300">
              <p>Transaction ID: <span className="font-bold text-blue-600 dark:text-blue-400">{completedInvoice.transactionId}</span></p>
              <p>Amount Paid: <strong>LKR {completedInvoice.amount.toLocaleString()}</strong></p>
              <p>Payment Method: {completedInvoice.paymentMethod}</p>
              <p>Status: <span className="text-green-600 dark:text-green-400 font-bold">{completedInvoice.status}</span></p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handlePay} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FiZap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('boost.title')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('boost.subtitle')}</p>
              </div>
            </div>

            {/* Target Listing info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 text-xs">
              <span className="text-gray-400 font-semibold uppercase">Listing:</span>
              <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{jobTitle}</p>
            </div>

            {/* Package selector */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setPackageType('7_DAYS_PRIORITY')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  packageType === '7_DAYS_PRIORITY'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">7 Days</span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full">
                    POPULAR
                  </span>
                </div>
                <div className="text-lg font-extrabold text-gray-900 dark:text-white">LKR 1,500</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Top-ranked for 1 week</p>
              </div>

              <div
                onClick={() => setPackageType('30_DAYS_PRIORITY')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  packageType === '30_DAYS_PRIORITY'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">30 Days</span>
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full">
                    BEST VALUE
                  </span>
                </div>
                <div className="text-lg font-extrabold text-gray-900 dark:text-white">LKR 3,500</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Super placement 1 month</p>
              </div>
            </div>

            {/* Payment Method in Sri Lanka */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                {t('boost.method')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="method"
                    checked={paymentMethod === 'PAYHERE'}
                    onChange={() => setPaymentMethod('PAYHERE')}
                    className="text-blue-600"
                  />
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1">
                    PayHere Sri Lanka (Online Banking, eZ Cash, Genie, Frimi)
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="method"
                    checked={paymentMethod === 'CARD'}
                    onChange={() => setPaymentMethod('CARD')}
                    className="text-blue-600"
                  />
                  <FiCreditCard className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1">
                    Visa / Mastercard / AMEX (Instant Activation)
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="method"
                    checked={paymentMethod === 'BANK_TRANSFER'}
                    onChange={() => setPaymentMethod('BANK_TRANSFER')}
                    className="text-blue-600"
                  />
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1">
                    Direct Bank Deposit (BOC / Commercial Bank / Sampath)
                  </span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <FiZap />
                {loading ? 'Processing...' : `${t('boost.payNow')} — LKR ${amount.toLocaleString()}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PriorityBoostModal;

