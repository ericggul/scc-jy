import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

export default function CValHome() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>C-VAL</h1>
        <a className={styles.authorLink} href="https://portfolio-jyc.org">
          Jeanyoon Choi
        </a>
      </header>

      <figure className={styles.figure}>
        <Image
          alt="C-VAL의 모의 주식시장에서 시장 조건, 가격 발견, 주문, 체결을 보여주는 4채널 화면"
          className={styles.image}
          height={2160}
          priority
          sizes="(min-width: 1120px) 1080px, calc(100vw - 48px)"
          src="/image/main.png"
          width={3840}
        />
      </figure>

      <section className={styles.details} aria-label="작품 설명">
        <aside className={styles.metadata}>
          <p>Multi-Device Web Artwork</p>
          <p>C-VAL (Conducting Volatility, Activity, Liquidity)</p>
          <p>4 Channels, Audiences’ Mobiles</p>
          <a
            className={styles.clubLink}
            href="https://scc-exhibition-guide.prism011312.workers.dev/"
            rel="noreferrer"
            target="_blank"
          >
            Soft Coding Club
          </a>
          <Link className={styles.entryLink} href="/whole">실제 경험 열기</Link>
          <p className={styles.mobileNotice}>실제 경험은 데스크톱 화면에서 열립니다.</p>
          <Link className={styles.mobileEntryLink} href="/mobile">휴대폰으로 참여하기</Link>
        </aside>

        <div className={styles.statement}>
          <p>
            동시대 대한민국은 하나의 거대한 롤러코스터이자 카지노이다. 역사적 급등과 급락의 반복 속,
            특정 기업과 산업, 정치인의 한마디, 실시간 뉴스와 여론이 수조원의 행방을 흔든다.
            모든 것은 더 짧은 주기로, 더 빠르게, 더 미친듯이 변한다. 이 모든 것은 어떻게 감각될 수 있을까?
          </p>
          <p>
            〈C-VAL〉은 Conducting Volatility, Activity, Liquidity의 약자다. 관람객은 휴대폰을 움직이고
            회전하며 기기의 방향·회전 입력을 통해 변동성(Volatility), 거래 활동(Activity),
            이 세 값은 단순히 화면의 숫자를 바꾸는 조절기가 아니다. 에이전트 기반 시장 시뮬레이션 안에서
            참여자들의 주문 빈도, 매수·매도 판단, 호가 간격, 유동성 공급과 취소·보충의 조건을 바꾸고,
            그 주문들이 연속 경매를 거쳐 체결되며 가격이 형성된다.
          </p>
          <p>
            관람객은 시장을 조종하는 지휘자가 된다.
            손목의 작은 움직임은 V/A/L을 거쳐 주문장과 체결가를 뒤흔들고, 주변 화면으로 전파된다.
            예컨대 손에 쥔 휴대폰을 흔드는 관람객의 몸짓은 <strong>보이지 않는 손</strong>으로 작동한다.
            그 몸짓은 거대 퀀트 트레이더의 권능을 우스꽝스럽게 흉내 내면서도, 개인 역시 시장의 변동성을
            가격의 폭등과 폭락은 여러 화면에서 서로 다른 사회적 층위로 번역된다. 시장·정치·사회 뉴스는
            축적되는 속보의 흐름이 되고, 주가의 변화는 소고기 매출 증가와 자살률의 증가에 파생적으로 영향을 준다.
            댓글 화면에는 리딩방, 단체 채팅방을 연상시키는 수많은 의견과 감정이 쏟아진다.
          </p>
          <p>
            떡상할 때도 {"<C-VAL>"}, 떡락할 때도 {"<C-VAL>"}이다. 기쁠 때도 {"<C-VAL>"},
            화날 때도 {"<C-VAL>"}이다. {"<C-VAL>"}은 한국어 감탄사 “씨발”의 음가를 차용한,
            가장 한국적인 표현이자,
            방향을 상실한채 폭등과 폭락이 일상이 되어버린 현대 금융시장의 실패를 표상한다.
            미쳐 날뛰고 있는 신자유주의적 욕망을 향한 유쾌한 외침, 그것이 바로 {"<C-VAL>"}이다.
          </p>
        </div>
      </section>

    </main>
  );
}
