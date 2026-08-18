# 반포자이즘 EC2와 SCC socket 공동 운영 결정

## 결정

- 당분간 SCC의 C-VAL과 ddong-meong socket relay는 반포자이즘이 이미
  사용하는 서울 `t4g.small` EC2 한 대에 공동 배치한다.
- 이는 **현재 사용자 승인된 비용 우선안**이다. 실제 AWS 변경, DNS 전환,
  Vercel 환경 변수 변경, 기존 Banpo PM2 재시작은 그때그때 별도 승인이
  있어야 한다.
- 프론트엔드는 계속 각자의 Vercel 앱(`c-val.vercel.app`,
  `ddong-meong.vercel.app`)이다. EC2에는 realtime socket relay만 둔다.

## 유지할 경계

```text
Banpo socket hostname  -> Nginx -> Banpo Socket.IO process (기존 4000)
C-VAL socket hostname -> Nginx -> C-VAL Socket.IO process (별도 loopback port)
ddong socket hostname -> Nginx -> ddong Socket.IO process (별도 loopback port)
```

- 기존 Banpo가 PM2로 관리되므로, 감사 결과가 달라지지 않는 한 새 relay도
  각각 이름 붙인 PM2 프로세스로 둔다. 작업 디렉터리, 환경 파일, 포트,
  Socket.IO 이벤트·room 상태를 가진다. 메모리 상태를 공유하지 않는다.
- Nginx가 TLS와 hostname별 WebSocket proxy를 담당한다. 외부에는 80/443만
  열고 relay port는 `127.0.0.1`에만 bind한다.
- C-VAL과 ddong-meong은 한 EC2를 쓴다고 해서 하나의 socket 서버나
  hostname으로 합치지 않는다.

## 비용 판단

- AWS의 `t4g.small` 무료 trial은 2026-12-31 UTC까지 계정 전체·리전 합산
  월 750시간이다. 반포자이즘의 상시 인스턴스 하나는 한 달 약 720–744시간을
  사용하므로, 별도 SCC `t4g.small`을 추가하면 대체로 유료 시간이 생긴다.
- 기존 인스턴스에 relay를 추가하면 두 번째 공인 IPv4, EBS, 인스턴스의
  고정비가 생기지 않는다. 단, CPU surplus credit, 인터넷 송신량, 메모리
  부족은 별도 비용/성능 위험이다.
- 2027-01-01부터는 `t4g.small`도 일반 On-Demand 과금으로 전환된다. 그때
  분리 필요성과 Lightsail 2GB 고정 요금을 다시 비교한다.

## 이후 분리 경로

각 앱의 socket hostname을 처음부터 유지한다. 나중에 C-VAL 또는
ddong-meong을 Lightsail/새 EC2로 옮길 때 새 호스트에 같은 relay와 Nginx
설정을 배치하고, **유휴 시간**에 해당 hostname의 DNS만 새 IP로 바꾼다.
Vercel URL과 앱 route는 바꾸지 않는다. Socket 서버의 인메모리 세션은
호스트 간 이전되지 않으므로 전환 시 현재 연결은 재접속한다.

## 실행 전 확인 항목

1. EC2의 실제 인스턴스 ID, OS, SSH 권한, 현재 Nginx vhost, Banpo PM2
   프로세스 및 4000 port 점유를 읽기 전용으로 확인한다.
2. C-VAL·ddong-meong의 production relay 실행 진입점과 환경 변수,
   origin allowlist를 확정한다.
3. 전시 기기 수로 C-VAL 20 Hz snapshot 상황을 포함해 CPU, 메모리,
   `CPUSurplusCreditsCharged`, 네트워크 송신량, reconnect를 관측한다.
4. 위 결과를 보고 포트·도메인·서비스 파일·Vercel 환경 변수 변경안을
   사용자에게 먼저 제시하고 승인 후에만 배포한다.

## 에이전트 주의

다른 에이전트는 이 문서를 배포 승인으로 해석하면 안 된다. 특히 기존
반포자이즘 process 재시작, DNS 레코드 변경, AWS firewall 변경, Vercel
재배포, secret 기록은 사용자의 명시적 승인 없이는 금지다.
