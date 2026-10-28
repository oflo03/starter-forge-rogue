# 현재 UI 검증

최신 사용자 지시에 따라 원본 PokéRogue UI·이미지를 그대로 사용합니다. 초기 별도 HTML 전투 화면과 true-black-flat 방향은 보관된 이전 구현에만 해당하며, 현재 배포 진입점에는 적용하지 않습니다.

원본 Phaser 화면에서 파트너 만남·이름 입력·실제 전투 두 번째 턴·다섯 성장 보상·추가 파트너 두 마리 합류·저장 데이터 복원을 확인했습니다. 프로덕션 빌드에서도 기존 기술 세 개와 시작 특성, 이름 길이 검사, 일반 설정의 시드 표시를 확인했습니다. 데스크톱과 모바일 화면 전환에서 확인한 원작 설정의 터치 전용 행 갱신 오류는 해당 행이 없는 경우 갱신을 건너뛰도록 수정했습니다.

창작 파트너에는 임시 원본 포켓몬 이미지를 표시합니다. 별도 창작 이미지는 아직 연결하지 않았습니다.


## 2026-10-28: standalone mode and temporary partner identity
User requested one mode and simple type-colored circles with type symbols, retaining the original pixel battle UI. Title now offers adventure, load, history and settings; account, tutorial and collection menus are absent. Partner appearances are procedural local Canvas textures with 18 monochrome symbols, shared by field/summary/party and restored from permanent type metadata. Dual types split the circle and show both symbols. Native desktop browser verified growth 16/26/36/46/56, recruitment and save reconstruction with no console errors. Opponent sprites remain original.
