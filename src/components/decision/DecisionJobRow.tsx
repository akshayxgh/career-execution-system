import { Mail } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";

export default function DecisionJobRow({job}:{job:DecisionJob}) {
  const bg=job.recommendation==="Apply"?"bg-green-50 hover:bg-green-100":"bg-amber-50 hover:bg-amber-100";
  const badge=job.score>=90?"bg-green-600":job.score>=75?"bg-blue-600":job.score>=60?"bg-yellow-500":"bg-red-600";
  const d=job.posted_date?new Date(job.posted_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):"-";
  return (
    <div onClick={()=>window.open(job.url,"_blank")}
      className={`grid items-center border-b px-4 py-3 cursor-pointer ${bg}`}
      style={{gridTemplateColumns:"80px 3fr 2fr 120px 140px 150px 90px"}}>
      <div className="flex justify-center">
        <div className={`h-11 w-11 rounded-full ${badge} text-white font-bold flex items-center justify-center shadow`}>{job.score}</div>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {job.email_to_hr && <Mail className="h-4 w-4 text-blue-600"/>}
        <span className="truncate font-medium">{job.title}</span>
      </div>
      <div className="truncate">{job.company_name}</div>
      <div>{d}</div>
      <div>{job.salary||"-"}</div>
      <div onClick={e=>e.stopPropagation()}>
        <select defaultValue={job.my_status} className="w-full border rounded px-2 py-1 bg-white text-black">
          <option>NEW</option><option>SAVED</option><option>HIDDEN</option><option>APPLIED</option>
        </select>
      </div>
      <div onClick={e=>e.stopPropagation()}>
        <button className="px-3 py-1 rounded bg-slate-700 text-white">View</button>
      </div>
    </div>
  );
}
