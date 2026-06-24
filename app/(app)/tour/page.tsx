import { RenterTours } from "./components/renter-tours";

/* Renter "My tours" — fully client-rendered: tour requests live in
   localStorage and are filtered to the signed-in renter's email. */
export default function TourPage() {
  return <RenterTours />;
}
