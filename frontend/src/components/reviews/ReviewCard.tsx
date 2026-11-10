import React from 'react';
import StarRating from '../common/StarRating';
import type { Review } from '../../types';
import { FiUser, FiCalendar } from 'react-icons/fi';

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            {review.reviewer?.fullName ? review.reviewer.fullName.charAt(0).toUpperCase() : <FiUser />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{review.reviewer?.fullName || 'Anonymous'}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <FiCalendar className="w-3 h-3" />
              <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent'}</span>
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} size={14} />
      </div>

      <p className="text-sm text-gray-600 mt-2 leading-relaxed">
        {review.comment}
      </p>
    </div>
  );
};

export default ReviewCard;
