import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">서비스 이용약관</h1>
          <p className="text-sm text-gray-500 mb-8">최종 수정일: 2024년 12월 27일</p>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제1조 (목적)</h2>
            <p className="text-gray-600 mb-4">
              이 약관은 Sori(이하 "회사")가 제공하는 피드백 수집 서비스(이하 "서비스")의 이용과 관련하여
              회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제2조 (정의)</h2>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li>"서비스"란 회사가 제공하는 피드백 수집 위젯 및 관리 대시보드를 의미합니다.</li>
              <li>"이용자"란 본 약관에 따라 서비스를 이용하는 회원을 의미합니다.</li>
              <li>"조직"이란 이용자가 서비스 내에서 생성한 단위로, 프로젝트와 멤버를 관리하는 테넌트를 의미합니다.</li>
              <li>"프로젝트"란 조직 내에서 피드백을 수집하는 단위를 의미합니다.</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <p className="text-gray-600 mb-4">
              ① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
              <br />
              ② 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.
              <br />
              ③ 변경된 약관은 공지사항을 통해 공지하며, 공지 후 7일 이내에 거부 의사를 표시하지 않으면
              동의한 것으로 간주합니다.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제4조 (서비스의 제공)</h2>
            <p className="text-gray-600 mb-4">
              회사는 다음과 같은 서비스를 제공합니다:
            </p>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li>웹사이트에 삽입 가능한 피드백 수집 위젯</li>
              <li>수집된 피드백 관리 대시보드</li>
              <li>Slack, Discord 등 외부 서비스 연동 (웹훅)</li>
              <li>API를 통한 피드백 데이터 접근</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제5조 (이용자의 의무)</h2>
            <p className="text-gray-600 mb-4">
              이용자는 다음 행위를 하여서는 안 됩니다:
            </p>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-2">
              <li>타인의 정보를 도용하는 행위</li>
              <li>서비스를 이용하여 법령 또는 공서양속에 반하는 행위</li>
              <li>서비스의 안정적 운영을 방해하는 행위</li>
              <li>서비스를 통해 수집한 정보를 무단으로 제3자에게 제공하는 행위</li>
            </ul>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제6조 (서비스 이용 요금)</h2>
            <p className="text-gray-600 mb-4">
              ① 서비스는 무료 플랜과 유료 플랜으로 구분됩니다.
              <br />
              ② 각 플랜별 제공 기능 및 이용 요금은 서비스 내 안내 페이지에서 확인할 수 있습니다.
              <br />
              ③ 유료 서비스 이용 시 결제 관련 사항은 별도 약관을 따릅니다.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제7조 (면책조항)</h2>
            <p className="text-gray-600 mb-4">
              ① 회사는 천재지변 또는 이에 준하는 불가항력으로 인해 서비스를 제공할 수 없는 경우
              책임이 면제됩니다.
              <br />
              ② 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.
              <br />
              ③ 회사는 이용자가 서비스를 통해 얻은 정보의 정확성, 신뢰성에 대해 보증하지 않습니다.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">제8조 (분쟁해결)</h2>
            <p className="text-gray-600 mb-4">
              ① 본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.
              <br />
              ② 서비스 이용과 관련하여 분쟁이 발생한 경우, 양 당사자는 원만한 해결을 위해 협의합니다.
            </p>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                본 약관은 2024년 12월 27일부터 시행됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
