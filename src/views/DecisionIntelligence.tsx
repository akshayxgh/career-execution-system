import { useEffect, useState } from "react";
import DecisionJobRow from "../components/decision/DecisionJobRow";
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
        <h1 className="mb-6 text-3xl font-bold">
          Decision Intelligence
        </h1>

        <p>Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">
          Decision Intelligence
        </h1>

        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Decision Intelligence
        </h1>

        <p className="text-gray-500">
          {jobs.length} Recommended Jobs
        </p>
      </div>

      {/* Header */}

      <div className="grid grid-cols-[90px_3fr_2fr_120px_120px_160px_90px] gap-4 border-b bg-gray-100 px-4 py-3 font-semibold rounded-t-lg">

        <div className="text-center">Score</div>

        <div>Job Title</div>

        <div>Company</div>

        <div>Posted</div>

        <div>Salary</div>

        <div>Status</div>

        <div>View</div>

      </div>

      {/* Rows */}

      <div className="space-y-2 mt-2">
        {jobs.map((job) => (
          <DecisionJobRow
            key={job.id}
            job={job}
          />
        ))}
      </div>

    </div>
  );
}