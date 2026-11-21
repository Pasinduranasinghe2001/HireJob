import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../services/job.service';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  FiUploadCloud,
  FiMapPin,
  FiAlertCircle,
  FiClock,
  FiPhone,
  FiMail,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';

export const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jobType, setJobType] = useState<'TEMPORARY' | 'PERMANENT'>('TEMPORARY');
  const [category, setCategory] = useState('Home Services');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [durationDays, setDurationDays] = useState<number | null>(null); // null = Unlimited

  // Contact info
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(user?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incoming = Array.from(e.target.files);
      const combined = [...imageFiles, ...incoming].slice(0, 5);
      setImageFiles(combined);
      setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
      if (incoming.length + imageFiles.length > 5) {
        toast('Maximum 5 photos allowed per post', { icon: 'ℹ️' });
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const nextFiles = imageFiles.filter((_, i) => i !== index);
    const nextPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(nextFiles);
    setImagePreviews(nextPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!contactPhone.trim() || contactPhone.replace(/\D/g, '').length < 9) {
      const phoneMsg = 'Please enter a valid contact phone number for client identification.';
      setError(phoneMsg);
      toast.error(phoneMsg);
      return;
    }

    setLoading(true);

    try {
      // 1. Create the job with duration and mandatory client identification contact details
      const createdJob = await jobService.createJob({
        title,
        description,
        jobType,
        category,
        location,
        salaryMin: salaryMin === '' ? 0 : Number(salaryMin),
        salaryMax: salaryMax === '' ? 0 : Number(salaryMax),
        durationDays: durationDays,
        contactPhone: contactPhone.trim(),
        contactWhatsapp: contactWhatsapp.trim() || contactPhone.trim(),
        contactEmail: contactEmail.trim() || user?.email || undefined,
      });

      // 2. Upload images if provided (up to 5)
      if (imageFiles.length > 0) {
        try {
          await jobService.uploadJobImages(createdJob.id, imageFiles);
        } catch (imgErr) {
          console.warn('Image upload error', imgErr);
          toast.error('Service created, but some images failed to upload');
        }
      }

      toast.success('Service published to marketplace successfully!');
      navigate(`/jobs/${createdJob.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to post service. Check required fields.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-8 md:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {t('nav.postJob')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Publish your service or job opportunity on the HireJob marketplace for direct customer contact.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <FiAlertCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Type of Service / Opportunity
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <label
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition ${
                  jobType === 'TEMPORARY'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="jobType"
                    checked={jobType === 'TEMPORARY'}
                    onChange={() => setJobType('TEMPORARY')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-sm">{t('search.temporary')}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6">
                  Short-term service, hourly gig, or task
                </span>
              </label>

              <label
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition ${
                  jobType === 'PERMANENT'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="jobType"
                    checked={jobType === 'PERMANENT'}
                    onChange={() => setJobType('PERMANENT')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-sm">{t('search.permanent')}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6">
                  Long-term contract, recurring job, or employment
                </span>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Service / Job Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Certified Electrician for House Wiring / Carpenter / Web Developer"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Home Services">Home Services & Repair (විදුලි/නල/පෙදරේරු)</option>
                <option value="Information Technology">Information Technology & Software</option>
                <option value="Construction">Construction & Carpentry (වඩු/ගොඩනැගිලි)</option>
                <option value="Design & Creative">Design & Creative Media</option>
                <option value="Delivery & Moving">Delivery, Van Hire & Moving (ප්‍රවාහන)</option>
                <option value="Education & Tutoring">Education & Tutoring (ගුරු)</option>
                <option value="Automotive">Auto Mechanics & Repair (වාහන)</option>
                <option value="Other">Other Services</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Location (District / City) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiMapPin />
                </div>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Colombo, Kandy, Gampaha, Galle"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Duration Selector (Auto-delete requirement) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FiClock className="text-blue-500" />
              <span>{t('post.duration')} (Auto-Delete Range)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: t('post.durationUnlimited'), value: null },
                { label: '7 Days', value: 7 },
                { label: '14 Days', value: 14 },
                { label: '30 Days', value: 30 },
              ].map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setDurationDays(opt.value)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center cursor-pointer ${
                    durationDays === opt.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              After selected duration expires, the post will automatically close and delete. Default is Unlimited.
            </p>
          </div>

          {/* Direct Contact & Mandatory Client Identification Details */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Provider &amp; Client Identification Details (Required)
              </h4>
              {user && (
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  Posting as: <strong>{user.fullName}</strong> ({user.email})
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <FiPhone />
                  {t('post.phone')} *
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="077 123 4567"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <FaWhatsapp className="text-emerald-500" />
                  {t('post.whatsapp')}
                </label>
                <input
                  type="tel"
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  placeholder="94771234567"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <FiMail />
                  {t('post.email')} *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@gmail.com"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Salary / Rate / Budget in LKR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Min Rate / Budget (LKR)
              </label>
              <input
                type="number"
                min="0"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2500"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Max Rate / Budget (LKR)
              </label>
              <input
                type="number"
                min="0"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="15000"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Service Details & Requirements *
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed description of services offered, experience, equipment, or requirements..."
              className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Job Image Upload (Up to 5 photos) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Photos / Portfolio Images (Up to 5 Photos)
              </label>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {imageFiles.length} / 5 photos selected
              </span>
            </div>

            {/* Previews grid if any photos selected */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square">
                    <img src={preview} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-90 hover:opacity-100 transition"
                      title="Remove image"
                    >
                      <FiAlertCircle className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded font-bold">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {imageFiles.length < 5 && (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition cursor-pointer relative bg-gray-50 dark:bg-gray-700/30">
                <div className="space-y-1 text-center">
                  <FiUploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-300 justify-center">
                    <span className="relative font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {imageFiles.length === 0 ? 'Upload up to 5 photos' : 'Add more photos'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Select multiple files (PNG, JPG, WEBP)</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Publishing Service...' : 'Publish Service Listing'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostJobPage;
