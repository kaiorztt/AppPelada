# Pelada

App para organizar pelada: jogadores e presença, sorteio de times, rodízio e pagamentos.
Expo + React Native (Android e iOS com o mesmo código). Dados ficam salvos no celular.

## Rodar

```bash
npm install
npx expo start        # escaneie o QR code com o app Expo Go no Android
npx expo start --web  # versão web para testar no computador
```

## Regras

- **Sorteio:** 1 goleiro por time; linha sorteada; só o último time pode ficar incompleto.
- **Rodízio:** quem perde sai e o próximo da fila entra. Se o próximo estiver incompleto, completa
  com jogadores de quem saiu por **ordem de chegada** (se faltar goleiro, o goleiro de quem saiu fica).
  Quem sobra vai para o fim da fila. Empate: saem os dois (com 2+ times na fila).
- **Atrasados:** marcar presença depois do sorteio coloca o jogador no fim da fila.

## Estrutura

- `src/app/` — telas (Jogadores, Times, Rodízio, Pagamento)
- `src/logic/` — sorteio e rodízio (funções puras, testadas em `__tests__/`)
- `src/store/` — estado com Zustand, salvo via AsyncStorage

## Verificar

```bash
npm test
npx tsc --noEmit
npx expo lint
```

## Gerar APK

```bash
npx eas-cli@latest build -p android --profile preview
```
