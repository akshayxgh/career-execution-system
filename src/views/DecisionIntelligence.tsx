import { useEffect, useState } from "react";
import {
  getDecisionJobs,
  type DecisionJob,
} from "../services/decisionIntelligenceService";

export default function DecisionIntelligence() {
  const [jobs, setJobs] = useState<DecisionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);

        const data = await getDecisionJobs();
        setJobs(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? "Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">
          Decision Intelligence
        </h1>

        <p>Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">
          Decision Intelligence
        </h1>

        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">
        Decision Intelligence
      </h1>

      <p className="mb-6 text-gray-500">
        {jobs.length} recommended jobs
      </p>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-lg border p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {job.title}
                </h2>

                <p className="text-gray-600">
                  {job.company_name}
                </p>

                <p className="text-sm text-gray-500">
                  {job.location}
                </p>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold">
                  {job.score}/100
                </div>

                <div className="text-sm">
                  {job.recommendation}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm">
              {job.reason}
            </p>

            <div className="mt-4 flex gap-6 text-sm text-gray-500">
              <span>Status: {job.my_status}</span>
              <span>Source: {job.source}</span>
              <span>Posted: {job.posted_date ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}