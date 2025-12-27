import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          회원가입으로 돌아가기
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-500 mb-8">최종 수정일: 2024년 12월 27일</p>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              Sori(이하 "회사")는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고
              개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을
              두고 있습니다.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. 수집하는 개인정보 항목</h2>
            <p className="text-gray-600 mb-2">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li><strong>필수 항목:</strong> 이메일 주소, 이름(닉네임)</li>
              <li><strong>선택 항목:</strong> 프로필 이미지</li>
              <li><strong>자동 수집 항목:</strong> 접속 IP 주소, 브라우저 종류, 접속 일시</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li>회원 가입 및 관리: 회원제 서비스 이용에 따른 본인확인, 개인식별</li>
              <li>서비스 제공: 피드백 수집 및 관리 서비스 제공</li>
              <li>고객 지원: 문의사항 및 불만처리</li>
              <li>서비스 개선: 신규 서비스 개발 및 맞춤 서비스 제공</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="text-gray-600 mb-4">
              ① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에
              동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              <br /><br />
              ② 각각의 개인정보 보유 및 이용 기간은 다음과 같습니다:
            </p>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
              <li>접속 로그: 3개월</li>
              <li>관련 법령에 따른 보존 필요 시: 해당 법령에서 정한 기간</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="text-gray-600 mb-4">
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
              다만, 아래의 경우에는 예외로 합니다:
            </p>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라
                수사기관의 요구가 있는 경우</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">5. 개인정보 처리 위탁</h2>
            <p className="text-gray-600 mb-4">
              회사는 서비스 향상을 위해 아래와 같이 개인정보를 위탁하고 있습니다:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-sm text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-medium">수탁업체</th>
                    <th className="text-left py-2 font-medium">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2">데이터베이스 호스팅</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">Resend</td>
                    <td className="py-2">이메일 발송</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">6. 정보주체의 권리</h2>
            <p className="text-gray-600 mb-4">
              이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다:
            </p>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7. 개인정보의 파기</h2>
            <p className="text-gray-600 mb-4">
              ① 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
              지체없이 해당 개인정보를 파기합니다.
              <br /><br />
              ② 전자적 파일 형태의 정보는 복구 및 재생이 되지 않도록 기술적인 방법을 사용하여 파기합니다.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">8. 개인정보 보호책임자</h2>
            <p className="text-gray-600 mb-4">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
              정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-gray-600">
                <strong>개인정보 보호책임자</strong><br />
                이메일: privacy@sori.life
              </p>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">9. 개인정보처리방침 변경</h2>
            <p className="text-gray-600 mb-4">
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가,
              삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                본 개인정보처리방침은 2024년 12월 27일부터 시행됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
