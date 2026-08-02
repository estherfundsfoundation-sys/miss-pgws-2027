export const applicantStatuses = [
  "submitted",
  "under_review",
  "correction_requested",
  "waitlisted",
  "accepted",
  "declined",
] as const;

export type ApplicantStatus = (typeof applicantStatuses)[number];

export const applicantStatusLabels: Record<ApplicantStatus, string> = {
  submitted: "Application received",
  under_review: "Under review",
  correction_requested: "Action needed",
  waitlisted: "Waitlisted",
  accepted: "Accepted",
  declined: "Not selected",
};

export const applicantStatusReasons: Record<ApplicantStatus, string> = {
  submitted: "Application submission was received and recorded.",
  under_review: "Application moved into formal staff review.",
  correction_requested: "Applicant action is needed before review can continue.",
  waitlisted: "Application remains under consideration on the waitlist.",
  accepted: "Applicant was selected to advance as a Miss PGWS contestant.",
  declined: "Application review was completed and the applicant was not selected.",
};

type StatusCopy = {
  subject: string;
  headline: string;
  introduction: string;
  details: string[];
  encouragement: string;
};

export const applicantStatusCopy: Record<ApplicantStatus, StatusCopy> = {
  submitted: {
    subject: "We received your Miss PGWS application",
    headline: "Your application is officially in.",
    introduction:
      "Thank you for taking the time to share your story, service, faith, and goals with the Miss PGWS team.",
    details: [
      "Your submission is now part of the official applicant record.",
      "Staff may contact you if an answer, document, or agreement item needs attention.",
      "Continue checking your portal and email for official updates.",
    ],
    encouragement:
      "Submitting an application is an accomplishment, and we are grateful that you chose to take this step.",
  },
  under_review: {
    subject: "Congratulations — your Miss PGWS application is under review",
    headline: "Your application has moved into formal review.",
    introduction:
      "Congratulations on reaching this stage. The Miss PGWS team is now reviewing your application and supporting materials.",
    details: [
      "Review may include your eligibility, application responses, uploaded materials, and signed agreement.",
      "No action is needed unless the team contacts you for clarification or a correction.",
      "Under review does not guarantee selection, a title, or a scholarship award.",
    ],
    encouragement:
      "You should be proud of the work you submitted. Keep showing up with confidence, purpose, and professionalism.",
  },
  correction_requested: {
    subject: "Action needed for your Miss PGWS application",
    headline: "Your application needs a quick update.",
    introduction:
      "Your application is still active, but the Miss PGWS team needs additional information or a correction before review can continue.",
    details: [
      "Read the staff note below carefully and make only the requested updates.",
      "Return to your secure applicant portal to complete the correction.",
      "Reply to this email if the instruction is unclear; do not send passwords, codes, or sensitive financial information.",
    ],
    encouragement:
      "A correction request is not a rejection. It is an opportunity to strengthen and complete your application.",
  },
  waitlisted: {
    subject: "Your Miss PGWS application remains under consideration",
    headline: "You are still being considered.",
    introduction:
      "Thank you for your patience and for the care you put into your application. Your application has been placed on the Miss PGWS waitlist.",
    details: [
      "A waitlist decision is not an acceptance or a rejection.",
      "The team may contact you if a contestant space becomes available or more information is needed.",
      "Continue monitoring your portal and email for the next official update.",
    ],
    encouragement:
      "Your story and service matter. We appreciate your continued interest and patience during this process.",
  },
  accepted: {
    subject: "Congratulations — you have been accepted as a Miss PGWS contestant",
    headline: "Congratulations — you are advancing!",
    introduction:
      "We are excited to let you know that you have been selected to advance as a Miss PGWS contestant.",
    details: [
      "Miss PGWS is a faith-centered scholarship, leadership, service, advocacy, and personal-development experience.",
      "You will receive official onboarding, competition requirements, campaign guidance, and published deadlines through the portal and official email.",
      "Acceptance does not guarantee a final title or scholarship award; all awards and results follow the published competition rules.",
    ],
    encouragement:
      "This is the beginning of a purposeful journey. Bring your faith, your voice, your service, and your full commitment.",
  },
  declined: {
    subject: "An update on your Miss PGWS application",
    headline: "Thank you for sharing your story with us.",
    introduction:
      "After careful review, we are unable to advance your application in this Miss PGWS cycle.",
    details: [
      "This decision applies only to the current competition cycle.",
      "It does not diminish your leadership, faith, service, potential, or the value of your story.",
      "Continue following Esther Funds Foundation for future scholarships, leadership opportunities, and student resources.",
    ],
    encouragement:
      "Thank you for allowing us to learn more about you. We hope you continue pursuing every opportunity connected to your purpose.",
  },
};

export function isApplicantStatus(value: unknown): value is ApplicantStatus {
  return typeof value === "string" && applicantStatuses.includes(value as ApplicantStatus);
}

export function displayApplicantName(
  preferredName: string | null | undefined,
  legalName: string | null | undefined,
) {
  const source = preferredName?.trim() || legalName?.trim() || "Applicant";
  return source.split(/\s+/)[0];
}


