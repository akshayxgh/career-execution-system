import { supabase } from "../lib/supabase";

const USER_ID = "Akshay";
const BUCKET = "documents";

export async function uploadDocument(
  file: File,
  name: string,
  documentNumber?: string,
  issueDate?: string
) {
  const filePath = `${USER_ID}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data, error: dbError } = await supabase
    .from("documents")
    .insert({
      user_id: USER_ID,
      name,
      document_number: documentNumber || null,
      issue_date: issueDate || null,
      storage_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return data;
}

export async function getDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getDocumentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) throw error;

  return data.signedUrl;
}

export async function deleteDocument(id: string, path: string) {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (dbError) throw dbError;
}

export function mapDocument(doc: any) {
  return {
    id: doc.id,
    docName: doc.name,
    documentNo: doc.document_number ?? "",
    issueDate: doc.issue_date ?? "",
    storagePath: doc.storage_path,
    fileName: doc.file_name,
    fileSize: doc.file_size,
    mimeType: doc.mime_type,
  };
}