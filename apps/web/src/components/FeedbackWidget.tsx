import { useState } from "react";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { createFeedback } from "../server/feedback";
import type { FeedbackType } from "@sori/database";

interface FeedbackWidgetProps {
  projectId: string;
}

export function FeedbackWidget({ projectId }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<{
    type: FeedbackType;
    message: string;
    email: string;
  }>({
    type: "INQUIRY",
    message: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await createFeedback({
        data: {
          ...formData,
          projectId,
        },
      });

      setSuccess(true);
      setFormData({ type: "INQUIRY", message: "", email: "" });
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 py-3 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-5 h-5 group-hover:rotate-[-10deg] transition-transform" />
          <span className="font-semibold">Feedback</span>
        </button>
      )}

      {/* Widget Panel */}
      {isOpen && (
        <div className="bg-white w-80 md:w-96 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
            <h3 className="font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Share Feedback
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-gray-50/50">
            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 animate-in fade-in zoom-in">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <p className="font-medium text-gray-900">
                  Thank you for your feedback!
                </p>
                <p className="text-sm text-gray-500">We appreciate your input.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                    Type
                  </label>
                  <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    {(["INQUIRY", "BUG"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t })}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                          formData.type === t
                            ? "bg-indigo-100 text-indigo-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {t === "INQUIRY" ? "Question" : "Bug Report"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm placeholder-gray-400"
                    placeholder={
                      formData.type === "BUG"
                        ? "Describe expected vs actual behavior..."
                        : "How can we help you?"
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                    Email{" "}
                    <span className="text-gray-400 font-normal normal-case">
                      (Optional)
                    </span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-md border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send Feedback</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="bg-gray-50 p-2 text-center border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-medium">
              Powered by QnA Feedback
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
