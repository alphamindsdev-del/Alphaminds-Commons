import { useState } from "react";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { X } from "lucide-react";

export function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { member, setMember } = useAuthStore();
  const [displayName, setDisplayName] = useState(member?.display_name ?? "");
  const [bio, setBio] = useState("");
  const updateProfile = useUpdateProfile();

  if (!open) return null;

  const handleSave = async () => {
    try {
      const data = await updateProfile.mutateAsync({ display_name: displayName, bio });
      if (data.member) {
        setMember({ ...member!, display_name: data.member.display_name });
      }
      toast.success("Profile updated");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 card-shadow" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-xl">Edit Profile</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary resize-none" />
          </div>
          <button onClick={handleSave} disabled={updateProfile.isPending} className="w-full rounded-xl bg-primary text-white font-bold py-3 disabled:opacity-50">
            {updateProfile.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
