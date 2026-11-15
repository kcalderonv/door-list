import CardSkeleton from "@/components/card-skeleton";

export default function LoadingRegistration() {
  return <div className="registration-loading">
    <p role="status">Cargando evento…</p>
    <div className="registration-layout" aria-busy="true">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>;
}
