import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function DecisionIntelligence() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanies() {
      const { data, error } = await supabase
        .from("companies")
        .select("*");

      if (error) {
        console.error(error);
      } else {
        setCompanies(data ?? []);
      }

      setLoading(false);
    }

    loadCompanies();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">
        Decision Intelligence
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p>Connected to Supabase ✅</p>
          <p>Total Companies: {companies.length}</p>

          <ul className="mt-4">
            {companies.map((company) => (
              <li key={company.id}>
                {company.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}