import {useEffect,useState} from "react";
import DecisionTable from "../components/decision/DecisionTable";
import {getDecisionJobs,type DecisionJob} from "../services/decisionIntelligenceService";

export default function DecisionIntelligence(){
 const [jobs,setJobs]=useState<DecisionJob[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{(async()=>{try{setJobs(await getDecisionJobs())}catch(e:any){setError(e.message||"Error")}finally{setLoading(false)}})()},[]);
 if(loading) return <div className="p-6">Loading...</div>;
 if(error) return <div className="p-6 text-red-500">{error}</div>;
 return <div className="p-6">
   <h1 className="text-4xl font-bold mb-1">Decision Intelligence</h1>
   <p className="mb-6 text-gray-400">{jobs.length} Recommended Jobs</p>
   <DecisionTable jobs={jobs}/>
 </div>
}
