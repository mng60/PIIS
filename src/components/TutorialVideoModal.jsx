import { X, Youtube } from "lucide-react";

const TUTORIAL_URLS = {
  user:    "https://youtu.be/cqUpSYD2nH4",
  admin:   "https://youtu.be/bRm3Q3m2l5g",
  empresa: "https://youtu.be/kqfmFX0tWcM",
};

function toEmbedUrl(url) {
  return url.replace(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^?&]+)/,
    "https://www.youtube.com/embed/$1"
  );
}

export default function TutorialVideoModal({ open, onClose, role }) {
  if (!open) return null;

  const videoUrl = TUTORIAL_URLS[role] ?? TUTORIAL_URLS.user;
  const embedUrl = toEmbedUrl(videoUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 flex items-center gap-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors px-3 py-1.5 rounded-lg"
        >
          <X className="w-4 h-4" /> Cerrar
        </button>

        <div className="rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl">
          <div className="relative w-full aspect-video">
            <iframe
              src={embedUrl}
              title="Video tutorial"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-t border-white/10">
            <span className="text-sm font-medium text-white">Video tutorial de PlayCraft</span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              <Youtube className="w-3.5 h-3.5" /> Ver en YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
