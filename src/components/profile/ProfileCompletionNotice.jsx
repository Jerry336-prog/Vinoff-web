import { useContext } from 'react';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export default function ProfileCompletionNotice({ onEdit }) {
  const { user, isAdmin } = useContext(AuthContext);
  if (!user || isAdmin) return null;

  const required = [
    ['First name', user.firstName], ['Last name', user.lastName],
    ['Phone number', user.phone], ['Business name', user.profile?.companyName],
    ['Delivery address', user.profile?.address], ['City', user.profile?.city],
    ['State', user.profile?.state],
  ];
  const missing = required.filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
  if (user.profileUpdatedAt && !missing.length) return null;

  return (
    <section aria-labelledby="profile-notice-title" className="mb-6 rounded-2xl border border-brand-green-200 bg-brand-green-50/80 p-4 sm:p-5 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ClipboardCheck className="h-6 w-6 shrink-0 text-brand-green-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="profile-notice-title" className="text-sm font-extrabold text-brand-green-950">Welcome! Review and complete your profile</h2>
          <p className="mt-1 text-xs leading-relaxed text-brand-green-900">After signing up, open your profile and check your real name, business name, phone number and full delivery address. Make sure everything is correct and up to date, then click Save Profile Updates. You can also add a profile photo.</p>
          {missing.length > 0 && <p className="mt-2 text-xs font-semibold text-brand-green-800">Still needed: {missing.join(', ')}.</p>}
        </div>
        <button type="button" onClick={onEdit} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-green-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">Update My Profile <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </section>
  );
}
