import { supabase } from "../lib/supabase";

const USER_ID = "Akshay";

export async function loadState() {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("user_id", USER_ID)
    .single();

    if (error) {
    console.error("Cloud save failed:", error);
    } else {
    console.log("Cloud save successful");
    }

  return data?.data ?? null;
}

export async function saveState(state: unknown) {
  const { error } = await supabase
    .from("app_state")
    .upsert(
      {
        user_id: USER_ID,
        data: state,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
    console.error("Cloud save failed:", error);
    } else {
    console.log("Cloud save successful", state);
    }
}