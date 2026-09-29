import { useEffect, useState } from "react";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useUpdateAvatar } from "@/hooks/useUpdateAvatar";
import { useUpdateCover } from "@/hooks/useUpdateCover";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useAuthStore } from "@/store/authStore";
import { getMediaUrl, cn } from "@/lib/utils";
import { getApiBaseUrl, getApiToken } from "@/lib/api";
import { toast } from "sonner";
import { X, Camera, Loader2 } from "lucide-react";

function uploadProfilePhoto(endpoint: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<Record<string, any>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.max(5, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Upload failed: invalid response"));
        }
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err.error || msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.open("PUT", `${getApiBaseUrl()}${endpoint}`);
    const token = getApiToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(fd);
  });
}

export function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { member, setMember } = useAuthStore();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? member?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadLabel, setUploadLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile?.display_name ?? member?.display_name ?? "");
    setBio(profile?.bio ?? "");
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarPreview(null);
    setCoverPreview(null);
    setUploading(false);
    setUploadPct(0);
  }, [open]);

  if (!open) return null;

  const avatarUrl = profile?.avatar_url ?? member?.avatar_url ?? null;
  const coverUrl = profile?.cover_photo_url ?? null;

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const pickCover = (file: File | undefined) => {
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    try {
      let avatarKey: string | null = null;
      let coverKey: string | null = null;

      if (avatarFile) {
        setUploading(true);
        setUploadLabel("Uploading profile picture...");
        setUploadPct(0);
        const res = await uploadProfilePhoto("/v1/me/avatar", avatarFile, setUploadPct);
        avatarKey = res.avatar_r2_key ?? null;
      }
      if (coverFile) {
        setUploading(true);
        setUploadLabel("Uploading cover photo...");
        setUploadPct(0);
        const res = await uploadProfilePhoto("/v1/me/cover", coverFile, setUploadPct);
        coverKey = res.cover_photo_r2_key ?? null;
      }

      setUploading(true);
      setUploadLabel("Saving profile...");
      setUploadPct(100);
      const data = (await updateProfile.mutateAsync({
        display_name: displayName.trim(),
        bio: bio.trim(),
      })) as { member: { display_name: string } };

      if (data?.member) {
        setMember({
          ...member!,
          display_name: data.member.display_name,
          avatar_url: avatarKey ?? member?.avatar_url ?? null,
          cover_photo_url: coverKey ?? (member as any)?.cover_photo_url ?? null,
        });
      }

      toast.success("Profile updated");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 card-shadow max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-xl">Edit Profile</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5">
          {/* Cover photo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Cover Photo</label>
            <div className="relative h-28 w-full rounded-xl overflow-hidden border border-border bg-subtle">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
              ) : coverUrl ? (
                <img src={getMediaUrl(coverUrl)} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-text-secondary text-xs font-bold">No cover photo</div>
              )}
              <label className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-lg bg-black/60 text-white text-xs font-bold px-3 py-1.5 cursor-pointer hover:bg-black/75 transition-colors">
                <Camera className="h-3.5 w-3.5" /> Change
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          {/* Profile picture */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full ring-2 ring-border overflow-hidden shrink-0 bg-subtle">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : avatarUrl ? (
                <img src={getMediaUrl(avatarUrl)} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-text-secondary text-2xl font-bold">{displayName.charAt(0).toUpperCase() || "A"}</div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm">Profile Picture</p>
              <label className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border text-xs font-bold px-3 py-1.5 cursor-pointer hover:border-primary/40 transition-colors">
                <Camera className="h-3.5 w-3.5" /> Change photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickAvatar(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary resize-none" />
          </div>

          {(uploading || updateProfile.isPending) && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-subtle overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{uploadLabel || "Saving..."} {uploadPct}%</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={uploading || updateProfile.isPending}
            className={cn("w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2", (uploading || updateProfile.isPending) && "opacity-50")}
          >
            {(uploading || updateProfile.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading || updateProfile.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
