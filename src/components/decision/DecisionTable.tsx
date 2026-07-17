import type {DecisionJob} from "../../services/decisionIntelligenceService";
import DecisionJobRow from "./DecisionJobRow";

export default function DecisionTable({jobs}:{jobs:DecisionJob[]}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white text-black">
      <div className="sticky top-0 grid bg-slate-100 font-semibold border-b px-4 py-3"
      style={{gridTemplateColumns:"80px 3fr 2fr 120px 140px 150px 90px"}}>
        <div className="text-center">Score</div>
        <div>Job Title</div><div>Company</div><div>Posted</div><div>Salary</div><div>Status</div><div>View</div>
      </div>
      {jobs.map(j=><DecisionJobRow key={j.id} job={j}/>)}
    </div>
  );
}
