# 반포자이즘 EC2와 SCC socket 공동 운영 결정

> 현재 운영 상태(2026-08-27 확인): C-VAL, ddong-meong, SCC의 socket handler는
> 같은 EC2의 `scc-io` process와 `127.0.0.1:4001`을 공유한다. 일반 서버
> 업데이트의 유일한 명령은 `pnpm deploy:scc-relay`이며, 상세 규칙은
> [SCC shared relay deployment](./scc-relay-deployment.md)이 source of truth다.

## 결정

- C-VAL, ddong-meong, SCC는 반포자이즘이 이미 사용하는 서울 `t4g.small` EC2의
  **`scc-io` relay 하나**에 공동 배치한다.
- 일반 relay 코드 업데이트는 `scc-io`만 재시작한다. AWS 변경, DNS 전환,
  Vercel 환경 변수 변경, 기존 Banpo PM2 재시작은 별도 승인 대상이다.
- 프론트엔드는 계속 각자의 Vercel 앱(`c-val.vercel.app`,
  `ddong-meong.vercel.app`)이다. EC2에는 realtime socket relay만 둔다.

## 유지할 경계

```text
Banpo socket hostname  -> Nginx -> Banpo Socket.IO process (기존 4000)
SCC socket hostname    -> Nginx -> SCC Socket.IO process (loopback 4001)
```

- 기존 Banpo가 PM2로 관리되므로 SCC relay도 `scc-io`라는 PM2 프로세스 하나로
  둔다. C-VAL, ddong-meong, SCC는 서로 다른 Socket.IO 이벤트·room·상태를
  가지므로 relay 하나 안에서도 상태가 섞이지 않는다.
- Nginx가 TLS와 hostname별 WebSocket proxy를 담당한다. 외부에는 80/443만
  열고 relay port는 `127.0.0.1`에만 bind한다.
- 각 Vercel 앱은 같은 `NEXT_PUBLIC_SOCKET_URL`을 사용한다. SCC 브라우저를
  새로 연결할 때에는 그 정확한 deployed origin을 `SOCKET_ALLOWED_ORIGINS`에
  먼저 추가한다.

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

나중에 C-VAL만 분리해야 하면 C-VAL 전용 relay를 새 호스트에 띄우고,
그때만 C-VAL Vercel의 `NEXT_PUBLIC_SOCKET_URL`을 새 hostname으로 바꾼다.
ddong-meong은 기존 SCC relay에 둔다. Socket 서버의 인메모리 세션은 호스트
간 이전되지 않으므로 전환은 유휴 시간에 한다.

## 에이전트 주의

다른 에이전트는 일반 relay 업데이트 때 `pnpm deploy:scc-relay`만 사용한다.
특히 기존 반포자이즘 process 재시작, DNS 레코드 변경, AWS firewall 변경,
Vercel 재배포, secret 기록은 사용자의 명시적 승인 없이는 금지다.
