// Fine-print booking terms shown with an offer's inclusions — inside the
// disclosure (below the feature list) on the Offers list rows. The standalone
// Hot offer card is kept compact and shows neither this nor the feature list.
// Plain muted caption text (no italic — Inter italic isn't loaded, and nothing
// else on the site is italic).
//
// TODO: placeholder policy, pending her real deposit / cancellation /
// reschedule terms. Once the site's Terms section (#terms) is written this
// should be sourced from there — or link to it — rather than duplicating the
// copy here.

type OfferTermsProps = {
  className?: string;
};

export default function OfferTerms({ className = "" }: OfferTermsProps) {
  return (
    <p className={`text-caption text-muted ${className}`}>
      Booking requires a 50% deposit. Cancellations 7+ days before are refunded;
      later cancellations forfeit the deposit. One free reschedule.
    </p>
  );
}
