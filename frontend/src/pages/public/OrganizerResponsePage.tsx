import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Upload,
  User,
  X,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import { ORGANIZATION_TYPES } from '../../schemas';
import { uploadToCloudinary } from '../../utils/cloudinary';

export const OrganizerResponsePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Loaded applicant data
  const [adminQuestion, setAdminQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  // Editable application fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [applicantType, setApplicantType] = useState<'Individual Organizer' | 'Organization / Institution'>('Organization / Institution');
  const [personalIntro, setPersonalIntro] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Company / Business');
  const [applicantPosition, setApplicantPosition] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgLogo, setOrgLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!token) {
        setFetchError('Verification token is missing. Please access this page using the link in your email.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await api.auth.getOrganizerResponseDetails(token);
        const app = data.applicant;
        setFullName(app.fullName || '');
        setEmail(app.email || '');
        setPhone(app.phone || '');
        setApplicantType(app.applicantType === 'Individual Organizer' ? 'Individual Organizer' : 'Organization / Institution');
        setOrgName(app.organization || '');
        setOrgType(app.organizationType || 'Company / Business');
        setApplicantPosition(app.applicantPosition || '');
        setOrgDescription(app.organizationDescription || '');
        setOrgWebsite(app.organizationWebsite || '');
        setOrgLogo(app.organizationLogo || '');
        setPersonalIntro(app.personalIntroduction || '');
        setAdminQuestion(app.infoRequestedNotes || 'Please review and update your application details.');
      } catch (err: any) {
        setFetchError(err.message || 'Unable to load application details. The link may have expired.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [token]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo file size must not exceed 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);
    try {
      const url = await uploadToCloudinary(file, { folder: 'sheeba_organization_logos' });
      setOrgLogo(url);
    } catch (err: any) {
      setLogoUploadError(err.message || 'Failed to upload organization logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!answer.trim() && !orgWebsite.trim() && !orgDescription.trim()) {
      setSubmitError('Please provide an answer to the administration or update your information.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.auth.submitOrganizerResponse({
        token,
        answer: answer.trim(),
        phone: phone.trim() || undefined,
        applicant_type: applicantType,
        applicantType,
        personal_introduction: applicantType === 'Individual Organizer' ? personalIntro.trim() : undefined,
        organization: applicantType === 'Organization / Institution' ? orgName.trim() : fullName.trim(),
        organization_type: applicantType === 'Organization / Institution' ? orgType : undefined,
        applicant_position: applicantType === 'Organization / Institution' ? applicantPosition.trim() : undefined,
        organization_description: applicantType === 'Organization / Institution' ? orgDescription.trim() : undefined,
        organization_website: applicantType === 'Organization / Institution' ? (orgWebsite.trim() || undefined) : undefined,
        organization_logo: applicantType === 'Organization / Institution' ? (orgLogo || undefined) : undefined,
      });

      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#63474D] mb-3" />
        <p className="text-xs text-[#756366] font-medium">Loading your application details...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8DDD7] shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#2D1F23]">Link Expired or Invalid</h2>
          <p className="text-xs text-[#756366] leading-relaxed max-w-sm mx-auto">
            {fetchError}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#63474D] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#4E373C] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8DDD7] shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">Response Submitted Successfully!</h2>
          <p className="text-xs text-[#756366] leading-relaxed max-w-md mx-auto">
            Thank you! Your response and updated application have been forwarded directly to the Sheeba Administration. Your application is now back under active review.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="px-6 py-2.5 text-xs font-bold rounded-xl"
            >
              Back to Sheeba Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4 space-y-5">
      {/* Page Title */}
      <div className="text-center space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
          Organizer Application Review
        </h1>
        <p className="text-xs text-[#756366] max-w-md mx-auto">
          Please review the administration&apos;s request below, answer any questions, and update your application details.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8DDD7] shadow-sm space-y-6">
        {/* Admin Question Box */}
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 animate-pulse shrink-0" />
            <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
              Question from Sheeba Administration:
            </span>
          </div>
          <p className="text-xs font-semibold text-amber-950 leading-relaxed pl-6 whitespace-pre-wrap">
            {adminQuestion}
          </p>
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Answer Text Box */}
          <div className="space-y-1.5">
            <label htmlFor="applicant-answer" className="block text-xs font-bold text-[#2D1F23] flex items-center gap-1.5 cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5 text-[#63474D]" />
              Your Answer / Comment to Administration <span className="text-red-500">*</span>
            </label>
            <textarea
              id="applicant-answer"
              rows={3}
              required
              placeholder="Type your response, clarification, or comment here (e.g. Our official website is currently being built, here is our LinkedIn/GitHub profile...)"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Application Details Section */}
          <div className="pt-4 border-t border-[#E8DDD7] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#63474D] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Update Submitted Application Details
                </h3>
                <p className="text-[11px] text-[#756366]">
                  Review or update the fields below if corrections were requested.
                </p>
              </div>
            </div>

            {/* Applicant Type */}
            <div>
              <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                Applicant Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setApplicantType('Individual Organizer')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    applicantType === 'Individual Organizer'
                      ? 'bg-[#63474D]/10 border-[#63474D] text-[#63474D] font-bold shadow-xs'
                      : 'bg-[#FAF7F5] border-[#E8DDD7] text-[#756366]'
                  }`}
                >
                  Individual Organizer
                </button>
                <button
                  type="button"
                  onClick={() => setApplicantType('Organization / Institution')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    applicantType === 'Organization / Institution'
                      ? 'bg-[#63474D]/10 border-[#63474D] text-[#63474D] font-bold shadow-xs'
                      : 'bg-[#FAF7F5] border-[#E8DDD7] text-[#756366]'
                  }`}
                >
                  Organization / Institution
                </button>
              </div>
            </div>

            {/* Organization Specific Fields */}
            {applicantType === 'Organization / Institution' ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="resp-org-name" className="block text-xs font-semibold text-[#2D1F23] mb-1">
                      Organization Name
                    </label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none" />
                      <input
                        id="resp-org-name"
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="resp-org-type" className="block text-xs font-semibold text-[#2D1F23] mb-1">
                      Organization Type
                    </label>
                    <select
                      id="resp-org-type"
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] cursor-pointer"
                    >
                      {ORGANIZATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="resp-pos" className="block text-xs font-semibold text-[#2D1F23] mb-1">
                    Your Position or Role in Organization
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none" />
                    <input
                      id="resp-pos"
                      type="text"
                      required
                      value={applicantPosition}
                      onChange={(e) => setApplicantPosition(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="resp-desc" className="block text-xs font-semibold text-[#2D1F23] mb-1">
                    Short Organization Description
                  </label>
                  <div className="relative">
                    <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756366] pointer-events-none" />
                    <textarea
                      id="resp-desc"
                      rows={2}
                      required
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="resp-website" className="block text-xs font-semibold text-[#2D1F23] mb-1">
                    Website or Social Link (Add or Update)
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none" />
                    <input
                      id="resp-website"
                      type="text"
                      placeholder="https://example.com or social profile"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                    Organization Logo (Optional)
                  </label>
                  {orgLogo ? (
                    <div className="flex items-center gap-3 p-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl">
                      <img
                        src={orgLogo}
                        alt="Organization Logo"
                        className="w-10 h-10 rounded-full object-cover border border-[#E8DDD7]"
                      />
                      <span className="text-xs text-[#2D1F23] font-medium flex-1">Logo uploaded</span>
                      <button
                        type="button"
                        onClick={() => setOrgLogo('')}
                        className="p-1 text-[#756366] hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 bg-[#FAF7F5] hover:bg-[#F2ECE9] border border-dashed border-[#E8DDD7] rounded-xl cursor-pointer transition-all">
                      {isUploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#63474D]" />
                      ) : (
                        <Upload className="w-4 h-4 text-[#756366]" />
                      )}
                      <span className="text-xs font-medium text-[#756366]">
                        {isUploadingLogo ? 'Uploading logo...' : 'Click to upload new logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        disabled={isUploadingLogo}
                        onChange={handleLogoUpload}
                      />
                    </label>
                  )}
                  {logoUploadError && (
                    <p className="text-[11px] text-red-600 mt-1">{logoUploadError}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Individual Organizer */
              <div>
                <label htmlFor="resp-intro" className="block text-xs font-semibold text-[#2D1F23] mb-1">
                  Short Personal Introduction
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756366] pointer-events-none" />
                  <textarea
                    id="resp-intro"
                    rows={3}
                    required
                    value={personalIntro}
                    onChange={(e) => setPersonalIntro(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <label htmlFor="resp-phone" className="block text-xs font-semibold text-[#2D1F23] mb-1">
                Phone Number
              </label>
              <input
                id="resp-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <Button
              type="submit"
              fullWidth
              variant="primary"
              isLoading={isSubmitting || isUploadingLogo}
              className="py-3 text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-sm transition-all"
            >
              Submit Response &amp; Update Application
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

