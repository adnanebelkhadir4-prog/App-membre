import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement password reset with Supabase
      // const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      // For now, just show success message
      setSubmitted(true);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6" dir="rtl">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            استعادة كلمة المرور
          </h1>
          <p className="text-gray-600">
            أدخل بريدك الإلكتروني لاستعادة كلمة المرور
          </p>
        </div>

        {!submitted ? (
          <div className="bg-white rounded-lg shadow-lg border-r-4 border-gradient-to-b from-red-600 to-purple-600 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
              >
                {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
              </button>

              {/* Back to Login Link */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-purple-600 font-bold hover:underline"
                >
                  العودة إلى تسجيل الدخول
                </Link>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg border-r-4 border-green-600 p-8">
            <div className="text-center space-y-4">
              <div className="text-5xl">✓</div>
              <h2 className="text-2xl font-bold text-gray-800">
                تم إرسال الرابط بنجاح
              </h2>
              <p className="text-gray-600">
                تحقق من بريدك الإلكتروني وانقر على الرابط لاستعادة كلمة المرور
              </p>

              <Link
                to="/login"
                className="inline-block bg-gradient-to-l from-red-600 to-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:shadow-lg transition-shadow mt-4"
              >
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
