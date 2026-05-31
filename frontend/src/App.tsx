import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  CircleDollarSign,
  Coins,
  Crown,
  Flame,
  HandCoins,
  LogOut,
  Plus,
  Send,
  Share2,
  Sparkles,
  Swords,
  Ticket as TicketIcon,
  Trophy,
  UserPlus,
  Users,
  X
} from "lucide-react";
import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ApiFailure, apiRequest, websocketUrl } from "./api";
import { Button } from "@/components/ui/button";
import { Card, CardDark } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "parinator_token";
const LANGUAGE_KEY = "parinator_language";

const translations = {
  fr: {
    common: {
      appTagline: "paris entre potes",
      online: "en ligne",
      member: "membre",
      logout: "Déconnexion",
      language: "Langue",
      french: "FR",
      english: "EN",
      ticket: "Ticket",
      by: "par",
      participants: "Participants",
      side: "Camp",
      mySide: "Ton camp",
      stake: "Mise",
      amount: "Montant",
      points: "pts",
      selectPlaceholder: "— sélectionne —",
      share: "Partager",
      win: "WIN"
    },
    toast: {
      sessionExpired: "Session expirée.",
      actionImpossible: "Action impossible.",
      missingSharedBet: "Lien de pari introuvable.",
      realtimeUnavailable: "Temps réel indisponible.",
      connectedAs: "Connecté en tant que",
      betCreated: "Pari créé."
    },
    loading: {
      label: "Chargement"
    },
    nav: {
      aria: "Navigation principale",
      bets: "Paris",
      create: "Créer",
      friends: "Amis",
      debts: "Dettes"
    },
    auth: {
      connectionImpossible: "Connexion impossible.",
      heroTagline: "paris entre potes · saison 01",
      manifest: "Manifeste",
      heroLine1: "Les paris",
      heroLine2: "entre potes",
      heroLine2Mobile: "entre potes.",
      heroDescription:
        "Lance un défi, fixe les cotes, partage le ticket. Les dettes se règlent en points — et entre vous.",
      friendsOnly: "100% entre amis",
      accountAccess: "Accès compte",
      newMember: "Nouveau membre",
      welcomeBack: "Bon retour",
      registerTab: "Compte",
      loginTab: "Connexion",
      username: "Pseudo",
      email: "Email",
      identifier: "Pseudo ou email",
      password: "Mot de passe",
      registerButton: "Ouvrir le compte",
      loginButton: "Se connecter",
      footer: "0 carte bancaire · 0 robot"
    },
    features: {
      ticket: "Ticket",
      liveOdds: "Cotes live",
      winner: "Gagnant",
      debts: "Dettes"
    },
    bets: {
      invitationsEyebrow: "// invitations en attente",
      invitationsTitle: "Ton aval requis",
      mineEyebrow: "// tes paris",
      mineTitle: "Carnet personnel",
      mineEmpty: "Aucun pari pour le moment. Lance-toi.",
      friendsEyebrow: "// scène ouverte",
      friendsTitle: "Paris des potes",
      friendsEmpty: "Personne n'a encore lancé de défi.",
      linkInvitation: "Invitation par lien",
      joinToast: "Pari rejoint.",
      joinButton: "Rejoindre le pari",
      alreadyIn: "Déjà dans le coup",
      invitationAccepted: "Invitation acceptée.",
      invitationDeclined: "Invitation refusée.",
      resultSaved: "Résultat enregistré.",
      linkCopied: "Lien copié.",
      invitationSent: "Invitation envoyée.",
      statusDone: "Terminé",
      statusInvitation: "Invitation",
      statusLive: "En cours",
      emptyParticipants: "Aucun engagé.",
      invitePrompt: "Tu es invité — choisis ton camp",
      accept: "Accepter",
      decline: "Refuser",
      inviteFriend: "Inviter un pote",
      invite: "Inviter",
      winnerPrompt: "Désigner le gagnant"
    },
    create: {
      eyebrow: "// nouveau ticket",
      title: "Lancer un défi",
      status: "À émettre",
      titleLabel: "Titre du pari",
      titlePlaceholder: "Qui finit la pinte en premier ?",
      descriptionLabel: "Détail (facultatif)",
      descriptionPlaceholder: "Précise les règles, le contexte, l'enjeu…",
      duelSetup: "Configuration du duel",
      sideA: "Camp A",
      sideB: "Camp B",
      oddsA: "Cote A",
      oddsB: "Cote B",
      referenceStake: "Mise de référence",
      inviteFriends: "Inviter des potes",
      noFriends: "Ajoute d'abord un ami pour pouvoir l'inviter.",
      submit: "Émettre le ticket",
      defaultSideA: "Oui",
      defaultSideB: "Non"
    },
    friends: {
      inviteSent: "Invitation envoyée.",
      inviteAccepted: "Invitation acceptée.",
      inviteRemoved: "Invitation retirée.",
      addEyebrow: "// ajouter",
      addTitle: "Recruter un pote",
      identifier: "Pseudo ou email",
      send: "Envoyer",
      incomingEyebrow: "// reçues",
      incomingTitle: "Pour toi",
      incomingEmpty: "Aucune invitation reçue.",
      wantsIn: "veut entrer",
      outgoingEyebrow: "// envoyées",
      outgoingTitle: "En attente",
      outgoingEmpty: "Aucune invitation envoyée.",
      pending: "● en attente",
      rosterTitle: "Tes potes",
      rosterEmpty: "Aucun pote ajouté. Recrute."
    },
    debts: {
      oweEyebrow: "// tu dois",
      owedEyebrow: "// on te doit",
      balanceEyebrow: "// balance",
      passiveEyebrow: "// passif",
      activeEyebrow: "// actif",
      oweTitle: "Je dois",
      owedTitle: "On me doit",
      oweEmpty: "Aucune dette ouverte. Bien joué.",
      owedEmpty: "Personne ne te doit rien.",
      youOwe: "Tu dois à",
      owesYou: "Te doit",
      settled: "Réglée",
      open: "Ouverte",
      ticketPrefix: "Ticket :",
      settle: "Régler"
    }
  },
  en: {
    common: {
      appTagline: "bets between friends",
      online: "online",
      member: "member",
      logout: "Log out",
      language: "Language",
      french: "FR",
      english: "EN",
      ticket: "Ticket",
      by: "by",
      participants: "Participants",
      side: "Side",
      mySide: "Your side",
      stake: "Stake",
      amount: "Amount",
      points: "pts",
      selectPlaceholder: "— select —",
      share: "Share",
      win: "WIN"
    },
    toast: {
      sessionExpired: "Session expired.",
      actionImpossible: "Action unavailable.",
      missingSharedBet: "Bet link not found.",
      realtimeUnavailable: "Realtime unavailable.",
      connectedAs: "Signed in as",
      betCreated: "Bet created."
    },
    loading: {
      label: "Loading"
    },
    nav: {
      aria: "Primary navigation",
      bets: "Bets",
      create: "Create",
      friends: "Friends",
      debts: "Debts"
    },
    auth: {
      connectionImpossible: "Unable to sign in.",
      heroTagline: "bets between friends · season 01",
      manifest: "Manifesto",
      heroLine1: "Bets",
      heroLine2: "between friends",
      heroLine2Mobile: "between friends.",
      heroDescription:
        "Create a challenge, set the odds, share the ticket. Debts settle in points, between you.",
      friendsOnly: "100% friends only",
      accountAccess: "Account access",
      newMember: "New member",
      welcomeBack: "Welcome back",
      registerTab: "Account",
      loginTab: "Log in",
      username: "Username",
      email: "Email",
      identifier: "Username or email",
      password: "Password",
      registerButton: "Open account",
      loginButton: "Log in",
      footer: "0 credit card · 0 bots"
    },
    features: {
      ticket: "Ticket",
      liveOdds: "Live odds",
      winner: "Winner",
      debts: "Debts"
    },
    bets: {
      invitationsEyebrow: "// pending invitations",
      invitationsTitle: "Your call",
      mineEyebrow: "// your bets",
      mineTitle: "Personal book",
      mineEmpty: "No bets yet. Start one.",
      friendsEyebrow: "// open board",
      friendsTitle: "Friends' bets",
      friendsEmpty: "No one has started a challenge yet.",
      linkInvitation: "Link invitation",
      joinToast: "Bet joined.",
      joinButton: "Join bet",
      alreadyIn: "Already in",
      invitationAccepted: "Invitation accepted.",
      invitationDeclined: "Invitation declined.",
      resultSaved: "Result saved.",
      linkCopied: "Link copied.",
      invitationSent: "Invitation sent.",
      statusDone: "Done",
      statusInvitation: "Invitation",
      statusLive: "Live",
      emptyParticipants: "No one joined.",
      invitePrompt: "You were invited - pick a side",
      accept: "Accept",
      decline: "Decline",
      inviteFriend: "Invite a friend",
      invite: "Invite",
      winnerPrompt: "Choose winner"
    },
    create: {
      eyebrow: "// new ticket",
      title: "Create a challenge",
      status: "To issue",
      titleLabel: "Bet title",
      titlePlaceholder: "Who finishes the pint first?",
      descriptionLabel: "Details (optional)",
      descriptionPlaceholder: "Clarify the rules, context, stake...",
      duelSetup: "Duel setup",
      sideA: "Side A",
      sideB: "Side B",
      oddsA: "Odds A",
      oddsB: "Odds B",
      referenceStake: "Reference stake",
      inviteFriends: "Invite friends",
      noFriends: "Add a friend first before inviting them.",
      submit: "Issue ticket",
      defaultSideA: "Yes",
      defaultSideB: "No"
    },
    friends: {
      inviteSent: "Invitation sent.",
      inviteAccepted: "Invitation accepted.",
      inviteRemoved: "Invitation removed.",
      addEyebrow: "// add",
      addTitle: "Recruit a friend",
      identifier: "Username or email",
      send: "Send",
      incomingEyebrow: "// received",
      incomingTitle: "For you",
      incomingEmpty: "No invitations received.",
      wantsIn: "wants in",
      outgoingEyebrow: "// sent",
      outgoingTitle: "Waiting",
      outgoingEmpty: "No invitations sent.",
      pending: "● pending",
      rosterTitle: "Your crew",
      rosterEmpty: "No friends added. Recruit one."
    },
    debts: {
      oweEyebrow: "// you owe",
      owedEyebrow: "// owed to you",
      balanceEyebrow: "// balance",
      passiveEyebrow: "// passive",
      activeEyebrow: "// active",
      oweTitle: "I owe",
      owedTitle: "Owed to me",
      oweEmpty: "No open debts. Nice.",
      owedEmpty: "No one owes you anything.",
      youOwe: "You owe",
      owesYou: "Owes you",
      settled: "Settled",
      open: "Open",
      ticketPrefix: "Ticket:",
      settle: "Settle"
    }
  }
};

type Language = keyof typeof translations;
type Copy = typeof translations.fr;

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  copy: Copy;
} | null>(null);

function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageContext.Provider");
  }
  return context;
}

function useCopy() {
  return useLanguage().copy;
}

type View = "bets" | "create" | "friends" | "debts";
type ViewDirection = 1 | -1;
type Side = "A" | "B";

const VIEW_ORDER: View[] = ["bets", "create", "friends", "debts"];

type PressableInlineStyle = React.CSSProperties & {
  "--press-shadow"?: string;
  "--press-depth"?: string;
};

const TAB_PALETTE: Record<
  View,
  {
    activeBg: string;
    activeColor: string;
    activeBorder: string;
    inactiveBg: string;
    inactiveColor: string;
    inactiveBorder: string;
    shadow: string;
  }
> = {
  bets: {
    activeBg: "#cf666d",
    activeColor: "#ffffff",
    activeBorder: "#984047",
    inactiveBg: "rgba(207, 102, 109, 0.18)",
    inactiveColor: "#84363d",
    inactiveBorder: "rgba(207, 102, 109, 0.45)",
    shadow: "#984047"
  },
  create: {
    activeBg: "#4f98a2",
    activeColor: "#ffffff",
    activeBorder: "#3f7f89",
    inactiveBg: "rgba(79, 152, 162, 0.20)",
    inactiveColor: "#285f68",
    inactiveBorder: "rgba(79, 152, 162, 0.45)",
    shadow: "#356f77"
  },
  friends: {
    activeBg: "#e8a49b",
    activeColor: "#26345c",
    activeBorder: "#b45c56",
    inactiveBg: "rgba(232, 164, 155, 0.34)",
    inactiveColor: "#783f3f",
    inactiveBorder: "rgba(180, 92, 86, 0.36)",
    shadow: "#ba746d"
  },
  debts: {
    activeBg: "#26345c",
    activeColor: "#ffffff",
    activeBorder: "#17213e",
    inactiveBg: "rgba(38, 52, 92, 0.12)",
    inactiveColor: "#26345c",
    inactiveBorder: "rgba(38, 52, 92, 0.32)",
    shadow: "#17213e"
  }
};

const FRIEND_BUTTON_PALETTE = [
  {
    bg: "rgba(207, 102, 109, 0.16)",
    border: "rgba(207, 102, 109, 0.44)",
    text: "#84363d",
    activeBg: "#cf666d",
    activeText: "#ffffff",
    activeBorder: "#984047",
    shadow: "#984047"
  },
  {
    bg: "rgba(232, 164, 155, 0.28)",
    border: "rgba(180, 92, 86, 0.34)",
    text: "#783f3f",
    activeBg: "#e8a49b",
    activeText: "#26345c",
    activeBorder: "#b45c56",
    shadow: "#ba746d"
  },
  {
    bg: "rgba(189, 208, 191, 0.42)",
    border: "rgba(156, 172, 157, 0.44)",
    text: "#26345c",
    activeBg: "#bdd0bf",
    activeText: "#26345c",
    activeBorder: "#9cac9d",
    shadow: "#8da190"
  },
  {
    bg: "rgba(79, 152, 162, 0.18)",
    border: "rgba(63, 127, 137, 0.36)",
    text: "#285f68",
    activeBg: "#4f98a2",
    activeText: "#ffffff",
    activeBorder: "#3f7f89",
    shadow: "#356f77"
  },
  {
    bg: "rgba(38, 52, 92, 0.10)",
    border: "rgba(38, 52, 92, 0.28)",
    text: "#26345c",
    activeBg: "#26345c",
    activeText: "#ffffff",
    activeBorder: "#17213e",
    shadow: "#17213e"
  }
];

type User = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

type AuthResponse = {
  token: string;
  user: User;
};

type FriendRequest = {
  id: string;
  user: User;
  status: string;
  createdAt: string;
};

type FriendsResponse = {
  friends: User[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};

type BetParticipant = {
  id: string;
  userId: string;
  username: string;
  side: Side | null;
  amount: number;
  status: "invited" | "accepted" | "declined";
  createdAt: string;
};

type Bet = {
  id: string;
  title: string;
  description: string | null;
  initiatorId: string;
  initiatorUsername: string;
  sideA: string;
  sideB: string;
  oddsA: number;
  oddsB: number;
  stake: number;
  winningSide: Side | null;
  status: "open" | "resolved";
  shareCode: string;
  createdAt: string;
  resolvedAt: string | null;
  participants: BetParticipant[];
};

type BetsResponse = {
  mine: Bet[];
  friends: Bet[];
};

type Debt = {
  id: string;
  betId: string;
  betTitle: string;
  debtorId: string;
  debtorUsername: string;
  creditorId: string;
  creditorUsername: string;
  amount: number;
  status: "open" | "settled";
  createdAt: string;
  settledAt: string | null;
};

type DebtsResponse = {
  iOwe: Debt[];
  owedToMe: Debt[];
};

type RealtimeEvent = {
  kind: string;
  message: string;
  betId: string | null;
  friendshipId: string | null;
  debtId: string | null;
  createdAt: string;
};

type Toast = {
  id: number;
  message: string;
};

const emptyFriends: FriendsResponse = { friends: [], incoming: [], outgoing: [] };
const emptyBets: BetsResponse = { mine: [], friends: [] };
const emptyDebts: DebtsResponse = { iOwe: [], owedToMe: [] };

const initials = (name: string) =>
  name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

const ticketNumber = (code: string) => code.slice(0, 6).toUpperCase();

const sideLabel = (bet: Pick<Bet, "sideA" | "sideB">, side: Side) =>
  side === "A" ? bet.sideA : bet.sideB;

const oddsFor = (bet: Pick<Bet, "oddsA" | "oddsB">, side: Side) =>
  side === "A" ? bet.oddsA : bet.oddsB;

/* ─────────────────────────────────────────────
   <App> — racine
   ───────────────────────────────────────────── */

export default function App() {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return stored === "en" || stored === "fr" ? stored : "fr";
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [viewTransition, setViewTransition] = useState<{
    active: View;
    previous: View | null;
    direction: ViewDirection;
    key: number;
  }>({
    active: "bets",
    previous: null,
    direction: 1,
    key: 0
  });
  const [friends, setFriends] = useState<FriendsResponse>(emptyFriends);
  const [bets, setBets] = useState<BetsResponse>(emptyBets);
  const [debts, setDebts] = useState<DebtsResponse>(emptyDebts);
  const [sharedBet, setSharedBet] = useState<Bet | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const copy = translations[language];
  const copyRef = useRef(copy);
  const view = viewTransition.active;

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const setView = useCallback((nextView: View) => {
    setViewTransition((current) => {
      if (nextView === current.active) return current;

      const currentIndex = VIEW_ORDER.indexOf(current.active);
      const nextIndex = VIEW_ORDER.indexOf(nextView);

      return {
        active: nextView,
        previous: current.active,
        direction: nextIndex > currentIndex ? 1 : -1,
        key: current.key + 1
      };
    });
  }, []);

  useEffect(() => {
    if (!viewTransition.previous) return;

    const timeout = window.setTimeout(() => {
      setViewTransition((current) =>
        current.key === viewTransition.key ? { ...current, previous: null } : current
      );
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [viewTransition.key, viewTransition.previous]);

  const shareCode = useMemo(() => {
    const match = window.location.pathname.match(/^\/join\/([^/]+)/);
    return match?.[1] ?? null;
  }, []);

  const pushToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setFriends(emptyFriends);
    setBets(emptyBets);
    setDebts(emptyDebts);
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      const currentCopy = copyRef.current;
      if (error instanceof ApiFailure && error.status === 401) {
        logout();
        pushToast(currentCopy.toast.sessionExpired);
        return;
      }
      pushToast(error instanceof Error ? error.message : currentCopy.toast.actionImpossible);
    },
    [logout, pushToast]
  );

  const refreshAll = useCallback(async () => {
    if (!token) return;
    const [friendsData, betsData, debtsData] = await Promise.all([
      apiRequest<FriendsResponse>("/api/friends", token),
      apiRequest<BetsResponse>("/api/bets", token),
      apiRequest<DebtsResponse>("/api/debts", token)
    ]);
    setFriends(friendsData);
    setBets(betsData);
    setDebts(debtsData);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiRequest<User>("/api/me", token)
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch(handleError)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handleError, token]);

  useEffect(() => {
    if (!token || !user) return;
    refreshAll().catch(handleError);
  }, [handleError, refreshAll, token, user]);

  useEffect(() => {
    if (!shareCode) return;
    apiRequest<Bet>(`/api/bets/share/${shareCode}`)
      .then(setSharedBet)
      .catch(() => pushToast(copyRef.current.toast.missingSharedBet));
  }, [pushToast, shareCode]);

  useEffect(() => {
    if (!token || !user) return;
    const socket = new WebSocket(websocketUrl(token));
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as RealtimeEvent;
      if (event.kind !== "connected") {
        pushToast(event.message);
        refreshAll().catch(handleError);
        if (shareCode) {
          apiRequest<Bet>(`/api/bets/share/${shareCode}`)
            .then(setSharedBet)
            .catch(() => null);
        }
      }
    };
    socket.onerror = () => pushToast(copyRef.current.toast.realtimeUnavailable);
    return () => socket.close();
  }, [handleError, pushToast, refreshAll, shareCode, token, user]);

  const onAuthenticated = (response: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
    pushToast(`${copy.toast.connectedAs} ${response.user.username}.`);
  };

  const renderView = (targetView: View) => {
    if (!token || !user) return null;

    switch (targetView) {
      case "bets":
        return (
          <BetsView
            bets={bets}
            friends={friends.friends}
            user={user}
            token={token}
            sharedBet={sharedBet}
            onRefresh={refreshAll}
            onError={handleError}
            onToast={pushToast}
            reloadShared={() => {
              if (shareCode) {
                apiRequest<Bet>(`/api/bets/share/${shareCode}`)
                  .then(setSharedBet)
                  .catch(handleError);
              }
            }}
          />
        );
      case "create":
        return (
          <CreateBetView
            friends={friends.friends}
            token={token}
            onCreated={(bet) => {
              setBets((current) => ({ ...current, mine: [bet, ...current.mine] }));
              setView("bets");
              pushToast(copy.toast.betCreated);
              refreshAll().catch(handleError);
            }}
            onError={handleError}
          />
        );
      case "friends":
        return (
          <FriendsView
            friends={friends}
            token={token}
            onRefresh={refreshAll}
            onError={handleError}
            onToast={pushToast}
          />
        );
      case "debts":
        return (
          <DebtsView
            debts={debts}
            token={token}
            onRefresh={refreshAll}
            onError={handleError}
          />
        );
    }
  };

  const hasViewTransition = viewTransition.previous !== null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, copy }}>
      <div className="world-bg" aria-hidden />
      <div className="world-wordmark" aria-hidden>PARINATOR</div>
      <div className="world-grain" aria-hidden />
      <div className="palette-rail" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {loading ? (
        <LoadingScreen />
      ) : !token || !user ? (
        <AuthScreen onAuthenticated={onAuthenticated} sharedBet={sharedBet} />
      ) : (
        <div className="min-h-screen pb-[120px] sm:pb-10">
          <TopBar user={user} onLogout={logout} />

          <main className="page-motion-viewport mx-auto max-w-[1080px] px-4 sm:px-8 py-6 sm:py-10">
            {viewTransition.previous && (
              <div
                key={`previous-${viewTransition.previous}-${viewTransition.key}`}
                aria-hidden="true"
                className={cn(
                  "page-motion-pane page-motion-pane-exit",
                  viewTransition.direction > 0
                    ? "page-motion-pane-exit-left"
                    : "page-motion-pane-exit-right"
                )}
              >
                {renderView(viewTransition.previous)}
              </div>
            )}
            <div
              key={`active-${view}-${viewTransition.key}`}
              className={cn(
                "page-motion-pane",
                hasViewTransition &&
                  (viewTransition.direction > 0
                    ? "page-motion-pane-enter-right"
                    : "page-motion-pane-enter-left")
              )}
            >
              {renderView(view)}
            </div>
          </main>

          <TabBar view={view} setView={setView} />

          <ToastStack toasts={toasts} />
        </div>
      )}
    </LanguageContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   Loading
   ───────────────────────────────────────────── */

function LoadingScreen() {
  const copy = useCopy();
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="text-center space-y-5 pop">
        <div className="vs-badge mx-auto" style={{ transform: "rotate(-8deg)" }}>VS</div>
        <div>
          <p className="eyebrow mb-1">{copy.loading.label}</p>
          <h1 className="font-display text-4xl tracking-tight uppercase">Parinator</h1>
        </div>
      </div>
    </main>
  );
}

function LanguageToggle({
  tone = "dark",
  className
}: {
  tone?: "ink" | "dark";
  className?: string;
}) {
  const { language, setLanguage, copy } = useLanguage();
  return (
    <div role="group" aria-label={copy.common.language} className={className}>
      <Segmented<Language>
        tone={tone}
        value={language}
        onChange={setLanguage}
        options={[
          { value: "fr", label: copy.common.french },
          { value: "en", label: copy.common.english }
        ]}
        className="w-[132px]"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   TopBar
   ───────────────────────────────────────────── */

function TopBar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const copy = useCopy();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-canvas/70 border-b border-edge/70">
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8 h-[72px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-lg bg-rose border border-rose/45 grid place-items-center shrink-0 shadow-[3px_3px_0_rgba(152,64,71,0.22)]">
            <Swords className="w-4 h-4 text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="font-display text-2xl tracking-tight uppercase leading-none">
                Parinator
              </h1>
              <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
                // {copy.common.appTagline}
              </span>
            </div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-ink-dim uppercase truncate">
              <span className="text-iris">●</span> {copy.common.online} · {user.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-edge/60">
            <div className="w-10 h-10 rounded-lg bg-lime/50 border border-lime-deep/45 grid place-items-center font-display text-sm text-ink">
              {initials(user.username)}
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] tracking-[0.18em] text-ink-dim uppercase">
                {copy.common.member}
              </p>
              <p className="font-display text-sm uppercase tracking-normal">{user.username}</p>
            </div>
          </div>
          <LanguageToggle className="shrink-0" />
          <Button
            variant="icon"
            size="iconSm"
            onClick={onLogout}
            aria-label={copy.common.logout}
            title={copy.common.logout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   TabBar
   ───────────────────────────────────────────── */

function TabBar({
  view,
  setView
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const copy = useCopy();
  const tabs: { id: View; icon: ReactNode; label: string }[] = [
    { id: "bets", icon: <TicketIcon className="w-5 h-5" />, label: copy.nav.bets },
    { id: "create", icon: <Plus className="w-5 h-5" />, label: copy.nav.create },
    { id: "friends", icon: <Users className="w-5 h-5" />, label: copy.nav.friends },
    { id: "debts", icon: <Coins className="w-5 h-5" />, label: copy.nav.debts }
  ];

  return (
    <nav
      aria-label={copy.nav.aria}
      className="fixed sm:bottom-6 bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] sm:w-auto safe-bottom"
    >
      <div className="flex w-full sm:w-auto items-center gap-3 rounded-2xl border border-edge bg-white/90 p-3 shadow-[0_18px_36px_-24px_rgba(38,52,92,0.42)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const active = view === tab.id;
          const palette = TAB_PALETTE[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              title={tab.label}
              onClick={() => setView(tab.id)}
              style={
                active
                  ? ({
                      color: palette.activeColor,
                      backgroundColor: palette.activeBg,
                      borderColor: palette.activeBorder,
                      "--press-shadow": palette.shadow,
                      "--press-depth": "2px"
                    } as PressableInlineStyle)
                  : ({
                      color: palette.inactiveColor,
                      backgroundColor: palette.inactiveBg,
                      borderColor: palette.inactiveBorder,
                      "--press-shadow": "rgba(38, 52, 92, 0.18)",
                      "--press-depth": "2px"
                    } as PressableInlineStyle)
              }
              className={cn(
                "pressable relative h-14 flex-1 min-w-0 sm:flex-none sm:h-[58px] sm:w-[58px] rounded-xl border flex items-center justify-center transition-colors hover:brightness-[0.98]"
              )}
            >
              {tab.icon}
              <span className="sr-only">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   Toasts
   ───────────────────────────────────────────── */

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md grid gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="ticket ticket-dark p-3 pl-4 flex items-center gap-3 pop"
        >
          <span className="w-9 h-9 rounded-lg bg-ember/30 border border-ember-deep/30 grid place-items-center shrink-0">
            <Bell className="w-3.5 h-3.5 text-ember-deep" />
          </span>
          <p className="text-sm leading-snug">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AuthScreen
   ───────────────────────────────────────────── */

function AuthScreen({
  onAuthenticated,
  sharedBet
}: {
  onAuthenticated: (response: AuthResponse) => void;
  sharedBet: Bet | null;
}) {
  const copy = useCopy();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response =
        mode === "register"
          ? await apiRequest<AuthResponse>("/api/auth/register", null, {
              method: "POST",
              body: { username, email, password }
            })
          : await apiRequest<AuthResponse>("/api/auth/login", null, {
              method: "POST",
              body: { identifier, password }
            });
      onAuthenticated(response);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : copy.auth.connectionImpossible);
    } finally {
      setBusy(false);
    }
  };

  const formFields = (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" ? (
        <>
          <div>
            <Label htmlFor="username" tone="dark">{copy.auth.username}</Label>
            <Input
              id="username"
              tone="dark"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="marcel"
            />
          </div>
          <div>
            <Label htmlFor="email" tone="dark">{copy.auth.email}</Label>
            <Input
              id="email"
              tone="dark"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="toi@parinator.app"
            />
          </div>
        </>
      ) : (
        <div>
          <Label htmlFor="identifier" tone="dark">{copy.auth.identifier}</Label>
          <Input
            id="identifier"
            tone="dark"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </div>
      )}
      <div>
        <Label htmlFor="password" tone="dark">{copy.auth.password}</Label>
        <Input
          id="password"
          tone="dark"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="bg-rose/10 border border-rose/40 rounded-xl px-4 py-3 text-rose text-sm font-mono">
          {error}
        </div>
      )}

      <Button variant="primary" size="lg" disabled={busy} type="submit" className="w-full mt-2">
        <Check className="w-4 h-4" />
        {mode === "register" ? copy.auth.registerButton : copy.auth.loginButton}
      </Button>
    </form>
  );

  return (
    <main className="min-h-[100dvh] lg:grid lg:grid-cols-[1.05fr_1fr] flex flex-col">
      {/* HERO — desktop only */}
      <section className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden">
        <div className="flex items-center gap-3 rise" style={{ animationDelay: "60ms" }}>
          <div className="w-11 h-11 rounded-lg bg-rose border border-rose/45 grid place-items-center shadow-[3px_3px_0_rgba(152,64,71,0.22)]">
            <Swords className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="font-display text-2xl uppercase tracking-tight leading-none">Parinator</p>
            <p className="eyebrow mt-1">{copy.auth.heroTagline}</p>
          </div>
        </div>

        <div className="max-w-xl rise" style={{ animationDelay: "180ms" }}>
          <p className="eyebrow mb-4">{copy.auth.manifest}</p>
          <h2 className="font-display uppercase tracking-tight leading-[0.92] text-[clamp(2.6rem,7vw,5.5rem)]">
            {copy.auth.heroLine1}<br />
            <span className="text-iris-dark">{copy.auth.heroLine2}</span>
          </h2>
          <p className="mt-6 text-ink-dim text-lg max-w-md leading-relaxed">
            {copy.auth.heroDescription}
          </p>

          <FeatureRow />
        </div>

        <div className="flex items-center justify-between text-ink-dim rise" style={{ animationDelay: "300ms" }}>
          <p className="font-mono text-xs tracking-[0.2em] uppercase">// v0.1 — beta</p>
          <p className="font-mono text-xs tracking-[0.2em] uppercase">{copy.auth.friendsOnly}</p>
        </div>
      </section>

      {/* MOBILE compact header */}
      <section className="lg:hidden px-5 pt-6 pb-3 rise" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-rose border border-rose/45 grid place-items-center shadow-[3px_3px_0_rgba(152,64,71,0.22)]">
              <Swords className="w-4 h-4 text-white" strokeWidth={2.25} />
            </div>
            <p className="font-display text-xl uppercase tracking-tight leading-none">Parinator</p>
          </div>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-dim">
            {copy.common.appTagline}
          </p>
        </div>
      </section>

      {/* FORM PANEL */}
      <section className="relative flex-1 flex flex-col justify-center px-5 pb-6 lg:p-12 lg:border-l border-edge/60 lg:bg-canvas-soft/40">
        <div className="w-full max-w-md mx-auto lg:space-y-4 rise" style={{ animationDelay: "360ms" }}>
          <div className="flex justify-end mb-4 lg:hidden">
            <LanguageToggle />
          </div>

          {/* Mobile-only tagline + shared bet hint */}
          <div className="lg:hidden mb-5">
            <p className="eyebrow mb-2">{copy.auth.manifest}</p>
            <h1 className="font-display uppercase tracking-tight leading-[0.95] text-4xl">
              {copy.auth.heroLine1}<br />
              <span className="text-iris-dark">{copy.auth.heroLine2Mobile}</span>
            </h1>
          </div>

          {sharedBet && (
            <div className="mb-5 flex items-center gap-3 p-4 rounded-xl border border-lime-deep/35 bg-lime/35">
              <Sparkles className="w-4 h-4 text-iris-dark shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-iris-dark">
                  {copy.common.ticket} {ticketNumber(sharedBet.shareCode)}
                </p>
                <p className="font-display text-sm uppercase tracking-tight truncate">
                  {sharedBet.title}
                </p>
              </div>
            </div>
          )}

          {/* Desktop heading */}
          <div className="hidden lg:flex items-start justify-between mb-2">
            <div>
              <p className="eyebrow">{copy.auth.accountAccess}</p>
              <h2 className="font-display text-3xl uppercase tracking-tight mt-1">
                {mode === "register" ? copy.auth.newMember : copy.auth.welcomeBack}
              </h2>
            </div>
            <LanguageToggle />
          </div>

          {/* Mobile heading */}
          <p className="lg:hidden eyebrow mb-3">
            {mode === "register" ? copy.auth.newMember : copy.auth.welcomeBack}
          </p>

          <Segmented<"register" | "login">
            tone="dark"
            value={mode}
            onChange={setMode}
            options={[
              { value: "register", label: copy.auth.registerTab },
              { value: "login", label: copy.auth.loginTab }
            ]}
            className="mb-4"
          />

          {formFields}

          {/* Footer line — desktop with perforation, mobile compact */}
          <div className="mt-5 lg:mt-6 flex items-center gap-3 text-ink-faint">
            <span className="flex-1 h-px bg-edge" />
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-dim text-center whitespace-nowrap">
              {copy.auth.footer}
            </p>
            <span className="flex-1 h-px bg-edge" />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureRow() {
  const copy = useCopy();
  const items = [
    {
      icon: <TicketIcon className="w-3 h-3" />,
      label: copy.features.ticket,
      className: "bg-rose/15 border-rose/35 text-rose"
    },
    {
      icon: <Flame className="w-3 h-3" />,
      label: copy.features.liveOdds,
      className: "bg-ember/30 border-ember-deep/30 text-ember-deep"
    },
    {
      icon: <Trophy className="w-3 h-3" />,
      label: copy.features.winner,
      className: "bg-lime/50 border-lime-deep/40 text-lime-dark"
    },
    {
      icon: <HandCoins className="w-3 h-3" />,
      label: copy.features.debts,
      className: "bg-iris/20 border-iris/40 text-iris-dark"
    }
  ];
  return (
    <div className="mt-8 inline-flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-surface/45 backdrop-blur p-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border font-mono text-[10px] tracking-[0.16em] uppercase",
            item.className
          )}
        >
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BetsView
   ───────────────────────────────────────────── */

function BetsView({
  bets,
  friends,
  user,
  token,
  sharedBet,
  onRefresh,
  onError,
  onToast,
  reloadShared
}: {
  bets: BetsResponse;
  friends: User[];
  user: User;
  token: string;
  sharedBet: Bet | null;
  onRefresh: () => Promise<void>;
  onError: (error: unknown) => void;
  onToast: (message: string) => void;
  reloadShared: () => void;
}) {
  const copy = useCopy();
  const invitations = bets.mine.filter((bet) =>
    bet.participants.some(
      (participant) => participant.userId === user.id && participant.status === "invited"
    )
  );
  const activeMine = bets.mine.filter((bet) => !invitations.some((invite) => invite.id === bet.id));

  return (
    <div className="space-y-10">
      {sharedBet && (
        <SharedBetCard
          bet={sharedBet}
          user={user}
          token={token}
          onRefresh={async () => {
            reloadShared();
            await onRefresh();
          }}
          onError={onError}
          onToast={onToast}
        />
      )}

      {invitations.length > 0 && (
        <Section
          eyebrow={copy.bets.invitationsEyebrow}
          title={copy.bets.invitationsTitle}
          icon={<Bell className="w-4 h-4" />}
          count={invitations.length}
        >
          <CardGrid>
            {invitations.map((bet, i) => (
              <BetCard
                bet={bet}
                user={user}
                friends={friends}
                token={token}
                key={bet.id}
                onRefresh={onRefresh}
                onError={onError}
                onToast={onToast}
                delay={i * 70}
              />
            ))}
          </CardGrid>
        </Section>
      )}

      <Section
        eyebrow={copy.bets.mineEyebrow}
        title={copy.bets.mineTitle}
        icon={<TicketIcon className="w-4 h-4" />}
        count={activeMine.length}
        empty={activeMine.length === 0 ? copy.bets.mineEmpty : undefined}
      >
        <CardGrid>
          {activeMine.map((bet, i) => (
            <BetCard
              bet={bet}
              user={user}
              friends={friends}
              token={token}
              key={bet.id}
              onRefresh={onRefresh}
              onError={onError}
              onToast={onToast}
              delay={i * 70}
            />
          ))}
        </CardGrid>
      </Section>

      <Section
        eyebrow={copy.bets.friendsEyebrow}
        title={copy.bets.friendsTitle}
        icon={<Users className="w-4 h-4" />}
        count={bets.friends.length}
        empty={bets.friends.length === 0 ? copy.bets.friendsEmpty : undefined}
      >
        <CardGrid>
          {bets.friends.map((bet, i) => (
            <BetCard
              bet={bet}
              user={user}
              friends={friends}
              token={token}
              key={bet.id}
              onRefresh={onRefresh}
              onError={onError}
              onToast={onToast}
              delay={i * 70}
            />
          ))}
        </CardGrid>
      </Section>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  icon,
  count,
  empty,
  children
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  count?: number;
  empty?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between gap-3 pb-3 border-b border-edge/60">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-dim">
            {eyebrow}
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-tight leading-none">
              {title}
            </h2>
            {typeof count === "number" && (
              <span className="inline-flex items-center rounded-lg border border-rose/30 bg-rose/10 px-2.5 py-1 font-mono text-sm text-rose tabular">
                [{String(count).padStart(2, "0")}]
              </span>
            )}
          </div>
        </div>
        <span className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ember-deep/30 bg-ember/30 text-ember-deep">
          {icon}
        </span>
      </header>

      {empty ? (
        <div className="ticket ticket-dark p-10 text-center">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-ink-dim">{empty}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-5">{children}</div>;
}

/* ─────────────────────────────────────────────
   SharedBetCard (lien /join/:code)
   ───────────────────────────────────────────── */

function SharedBetCard({
  bet,
  user,
  token,
  onRefresh,
  onError,
  onToast
}: {
  bet: Bet;
  user: User;
  token: string;
  onRefresh: () => Promise<void>;
  onError: (error: unknown) => void;
  onToast: (message: string) => void;
}) {
  const copy = useCopy();
  const [side, setSide] = useState<Side>("A");
  const [amount, setAmount] = useState(String(bet.stake));
  const myParticipant = bet.participants.find((p) => p.userId === user.id);
  const canJoin = bet.status === "open" && myParticipant?.status !== "accepted";

  const join = async () => {
    try {
      await apiRequest<Bet>(`/api/bets/join/${bet.shareCode}`, token, {
        method: "POST",
        body: { side, amount: Number(amount) }
      });
      onToast(copy.bets.joinToast);
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  return (
    <Card className="pop">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="eyebrow-ink flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-ember" /> {copy.bets.linkInvitation}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-tight leading-tight mt-1">
            {bet.title}
          </h2>
        </div>
        <Badge tone="lime" align="flat">
          № {ticketNumber(bet.shareCode)}
        </Badge>
      </div>

      <SideMatchup bet={bet} />

      <div className="perforation my-5" />

      {canJoin ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label>{copy.common.mySide}</Label>
              <SideSelector side={side} setSide={setSide} bet={bet} tone="ink" />
            </div>
            <div>
              <Label>{copy.common.stake}</Label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                mono
                className="w-full sm:w-32"
              />
            </div>
          </div>
          <Button variant="ink" onClick={join} size="lg" className="w-full">
            <Send className="w-4 h-4" />
            {copy.bets.joinButton}
          </Button>
        </div>
      ) : (
        <Badge tone="done" align="flat" className="!text-jade">
          {copy.bets.alreadyIn}
        </Badge>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────────
   BetCard
   ───────────────────────────────────────────── */

function BetCard({
  bet,
  user,
  friends,
  token,
  onRefresh,
  onError,
  onToast,
  delay = 0
}: {
  bet: Bet;
  user: User;
  friends: User[];
  token: string;
  onRefresh: () => Promise<void>;
  onError: (error: unknown) => void;
  onToast: (message: string) => void;
  delay?: number;
}) {
  const copy = useCopy();
  const [side, setSide] = useState<Side>("A");
  const [amount, setAmount] = useState(String(bet.stake));
  const [inviteUserId, setInviteUserId] = useState("");
  const myParticipant = bet.participants.find((p) => p.userId === user.id);
  const isInvitation = myParticipant?.status === "invited" && bet.status === "open";
  const isInitiator = bet.initiatorId === user.id;
  const availableInvitees = friends.filter(
    (friend) => !bet.participants.some((p) => p.userId === friend.id)
  );

  const respond = async (accept: boolean) => {
    try {
      await apiRequest<Bet>(`/api/bets/${bet.id}/respond`, token, {
        method: "POST",
        body: accept ? { accept, side, amount: Number(amount) } : { accept }
      });
      onToast(accept ? copy.bets.invitationAccepted : copy.bets.invitationDeclined);
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  const resolve = async (winningSide: Side) => {
    try {
      await apiRequest<Bet>(`/api/bets/${bet.id}/resolve`, token, {
        method: "POST",
        body: { winningSide }
      });
      onToast(copy.bets.resultSaved);
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  const copyShare = async () => {
    const url = `${window.location.origin}/join/${bet.shareCode}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast(copy.bets.linkCopied);
    } catch {
      onToast(url);
    }
  };

  const inviteFriend = async () => {
    if (!inviteUserId) return;
    try {
      await apiRequest<Bet>(`/api/bets/${bet.id}/invite`, token, {
        method: "POST",
        body: { userIds: [inviteUserId] }
      });
      setInviteUserId("");
      onToast(copy.bets.invitationSent);
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  const statusBadge =
    bet.status === "resolved" ? (
      <Badge tone="done">
        <Trophy className="w-3 h-3" />
        {copy.bets.statusDone}
      </Badge>
    ) : isInvitation ? (
      <Badge tone="pending">
        <Bell className="w-3 h-3" />
        {copy.bets.statusInvitation}
      </Badge>
    ) : (
      <Badge tone="live">
        <Flame className="w-3 h-3" />
        {copy.bets.statusLive}
      </Badge>
    );

  return (
    <Card className="rise" style={{ animationDelay: `${delay}ms` } as React.CSSProperties}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ticket-ink-dim">
              {copy.common.ticket} № {ticketNumber(bet.shareCode)}
            </span>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ticket-ink-dim">
              · {copy.common.by} {bet.initiatorUsername}
            </span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl uppercase tracking-tight leading-[1.05]">
            {bet.title}
          </h3>
          {bet.description && (
            <p className="mt-2 text-sm text-ticket-ink-dim leading-relaxed">{bet.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
          <button
            type="button"
            onClick={copyShare}
            className="w-12 h-12 rounded-xl border border-lime-deep/40 bg-lime/40 hover:bg-lime/55 grid place-items-center text-ticket-ink transition-colors"
            aria-label={copy.common.share}
            title={copy.common.share}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MATCHUP */}
      <div className="mt-5">
        <SideMatchup bet={bet} />
      </div>

      {/* PERFORATION */}
      <div className="perforation my-5" />

      {/* PARTICIPANTS */}
      <div>
        <p className="eyebrow-ink mb-2">
          {copy.common.participants} · {bet.participants.length}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {bet.participants.length === 0 && (
            <span className="font-mono text-xs text-ticket-ink-dim">
              {copy.bets.emptyParticipants}
            </span>
          )}
          {bet.participants.map((p) => (
            <ParticipantChip key={p.id} participant={p} bet={bet} />
          ))}
        </div>
      </div>

      {/* INVITATION */}
      {isInvitation && (
        <div className="mt-5 rounded-xl border border-ember-deep/30 bg-ember/25 p-5 space-y-3">
          <p className="eyebrow-ink flex items-center gap-1.5">
            <Bell className="w-3 h-3" />
            {copy.bets.invitePrompt}
          </p>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label>{copy.common.mySide}</Label>
              <SideSelector side={side} setSide={setSide} bet={bet} tone="ink" />
            </div>
            <div>
              <Label>{copy.common.stake}</Label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                mono
                className="w-full sm:w-32"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ink" onClick={() => respond(true)} className="flex-1">
              <Check className="w-4 h-4" />
              {copy.bets.accept}
            </Button>
            <Button variant="danger" onClick={() => respond(false)} className="flex-1">
              <X className="w-4 h-4" />
              {copy.bets.decline}
            </Button>
          </div>
        </div>
      )}

      {/* INITIATOR — invite + résolution */}
      {isInitiator && bet.status === "open" && (
        <div className="mt-5 space-y-3">
          {availableInvitees.length > 0 && (
            <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <Label>{copy.bets.inviteFriend}</Label>
                <select
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  className="field"
                >
                  <option value="">{copy.common.selectPlaceholder}</option>
                  {availableInvitees.map((friend) => (
                    <option value={friend.id} key={friend.id}>
                      {friend.username}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="ghostInk" onClick={inviteFriend}>
                <UserPlus className="w-4 h-4" />
                {copy.bets.invite}
              </Button>
            </div>
          )}
          <div className="rounded-xl border border-dashed border-lime-deep/45 bg-lime/25 p-4">
            <p className="eyebrow-ink mb-2 flex items-center gap-1.5">
              <Crown className="w-3 h-3" />
              {copy.bets.winnerPrompt}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghostInk" onClick={() => resolve("A")}>
                <Trophy className="w-4 h-4" />
                {bet.sideA}
              </Button>
              <Button variant="ghostInk" onClick={() => resolve("B")}>
                <Trophy className="w-4 h-4" />
                {bet.sideB}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ParticipantChip({
  participant,
  bet
}: {
  participant: BetParticipant;
  bet: Bet;
}) {
  const isWinner =
    bet.status === "resolved" &&
    bet.winningSide !== null &&
    participant.side === bet.winningSide &&
    participant.status === "accepted";

  let chipClass = "border-ticket-ink/20 bg-ticket-ink/[0.04] text-ticket-ink";
  if (participant.status === "invited")
    chipClass = "border-amber/40 bg-amber/10 text-amber";
  if (participant.status === "declined")
    chipClass = "border-rose/40 bg-rose/10 text-rose line-through";
  if (isWinner)
    chipClass = "border-iris-deep bg-iris/15 text-ink font-bold";

  return (
    <span className={cn("chip", chipClass)}>
      <span
        className={cn(
          "chip-avatar",
          isWinner ? "bg-ink/10 text-ink" : "bg-ticket-ink/10 text-ticket-ink"
        )}
      >
        {initials(participant.username)}
      </span>
      {participant.username}
      {participant.side && (
        <span className="font-display tracking-wide">· {sideLabel(bet, participant.side)}</span>
      )}
      {participant.amount > 0 && (
        <span className="font-display tabular">· {participant.amount}</span>
      )}
      {isWinner && <Crown className="w-3 h-3" />}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Side matchup — VS centerpiece
   ───────────────────────────────────────────── */

function SideMatchup({ bet }: { bet: Pick<Bet, "sideA" | "sideB" | "oddsA" | "oddsB" | "winningSide"> }) {
  return (
    <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
      <SideBox
        label={bet.sideA}
        odds={bet.oddsA}
        active={bet.winningSide === "A"}
        loser={bet.winningSide === "B"}
        align="left"
      />
      <SideBox
        label={bet.sideB}
        odds={bet.oddsB}
        active={bet.winningSide === "B"}
        loser={bet.winningSide === "A"}
        align="right"
      />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 grid place-items-center pointer-events-none">
        <div className="vs-badge">VS</div>
      </div>
    </div>
  );
}

function SideBox({
  label,
  odds,
  active,
  loser,
  align
}: {
  label: string;
  odds: number;
  active: boolean;
  loser: boolean;
  align: "left" | "right";
}) {
  const copy = useCopy();
  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-4 sm:p-5 min-h-[118px] flex flex-col overflow-hidden",
        active && align === "left" && "border-rose bg-rose/15",
        active && align === "right" && "border-iris-deep bg-iris/15",
        loser && "border-ember-deep/25 bg-ember/20 opacity-70",
        !active && !loser && align === "left" && "border-rose/35 bg-rose/10",
        !active && !loser && align === "right" && "border-iris/35 bg-iris/10"
      )}
    >
      {/* Decorative corner stamp */}
      <span
        className={cn(
          "absolute top-2 font-mono text-[9px] tracking-[0.2em] uppercase opacity-60",
          align === "left" ? "left-3" : "right-3"
        )}
      >
        {copy.common.side} {align === "left" ? "A" : "B"}
      </span>
      {/* Diagonal stripe for losing side */}
      {loser && (
        <div className="absolute inset-0 stripes opacity-[0.06] pointer-events-none" />
      )}
      {active && (
        <div
          className={cn(
            "absolute top-2 z-10",
            align === "left" ? "right-12 sm:right-14" : "right-2"
          )}
        >
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-ticket-ink text-white font-mono text-[9px] tracking-[0.2em] uppercase">
            <Crown className="w-2.5 h-2.5" /> {copy.common.win}
          </span>
        </div>
      )}
      <div className={cn("mt-5 flex flex-col", align === "right" && "items-end text-right")}>
        <p className="font-display text-base sm:text-lg uppercase tracking-tight leading-tight break-words">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ticket-ink-dim">
            ×
          </span>
          <span className="numframe text-3xl sm:text-4xl">{odds.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function SideSelector({
  side,
  setSide,
  bet,
  tone = "dark"
}: {
  side: Side;
  setSide: (side: Side) => void;
  bet: Pick<Bet, "sideA" | "sideB">;
  tone?: "ink" | "dark";
}) {
  return (
    <Segmented<Side>
      tone={tone}
      value={side}
      onChange={setSide}
      options={[
        { value: "A", label: bet.sideA || "A" },
        { value: "B", label: bet.sideB || "B" }
      ]}
    />
  );
}

/* ─────────────────────────────────────────────
   CreateBetView
   ───────────────────────────────────────────── */

function CreateBetView({
  friends,
  token,
  onCreated,
  onError
}: {
  friends: User[];
  token: string;
  onCreated: (bet: Bet) => void;
  onError: (error: unknown) => void;
}) {
  const copy = useCopy();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sideA, setSideA] = useState(copy.create.defaultSideA);
  const [sideB, setSideB] = useState(copy.create.defaultSideB);
  const [oddsA, setOddsA] = useState("2.00");
  const [oddsB, setOddsB] = useState("2.00");
  const [stake, setStake] = useState("10");
  const [mySide, setMySide] = useState<Side>("A");
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSideA((current) =>
      current === translations.fr.create.defaultSideA || current === translations.en.create.defaultSideA
        ? copy.create.defaultSideA
        : current
    );
    setSideB((current) =>
      current === translations.fr.create.defaultSideB || current === translations.en.create.defaultSideB
        ? copy.create.defaultSideB
        : current
    );
  }, [copy]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const bet = await apiRequest<Bet>("/api/bets", token, {
        method: "POST",
        body: {
          title,
          description,
          sideA,
          sideB,
          oddsA: Number(oddsA),
          oddsB: Number(oddsB),
          stake: Number(stake),
          mySide,
          invitedUserIds
        }
      });
      setTitle("");
      setDescription("");
      setInvitedUserIds([]);
      onCreated(bet);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const toggleInvite = (friendId: string) => {
    setInvitedUserIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    );
  };

  return (
    <div className="space-y-7">
      <header className="border-b border-edge/60 pb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-dim">
            {copy.create.eyebrow}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-tight leading-none mt-1">
            {copy.create.title}
          </h2>
        </div>
        <span className="hidden sm:inline-flex font-mono text-[10px] tracking-[0.2em] uppercase text-rose border border-rose/30 bg-rose/10 px-3 py-1.5 rounded-lg">
          {copy.create.status}
        </span>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <Label htmlFor="title" tone="dark">{copy.create.titleLabel}</Label>
          <Input
            id="title"
            tone="dark"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.create.titlePlaceholder}
            required
          />
        </div>

        <div>
          <Label htmlFor="description" tone="dark">{copy.create.descriptionLabel}</Label>
          <Textarea
            id="description"
            tone="dark"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={copy.create.descriptionPlaceholder}
            rows={3}
          />
        </div>

        <div className="rounded-2xl border-2 border-dashed border-ember-deep/35 p-5 sm:p-6 bg-ember/20">
          <p className="eyebrow mb-3 flex items-center gap-1.5">
            <Swords className="w-3 h-3" />
            {copy.create.duelSetup}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label tone="dark">{copy.create.sideA}</Label>
              <Input tone="dark" value={sideA} onChange={(e) => setSideA(e.target.value)} />
              <Label tone="dark" className="mt-3">{copy.create.oddsA}</Label>
              <Input
                tone="dark"
                type="number"
                min={1}
                step={0.01}
                value={oddsA}
                onChange={(e) => setOddsA(e.target.value)}
                mono
              />
            </div>
            <div>
              <Label tone="dark">{copy.create.sideB}</Label>
              <Input tone="dark" value={sideB} onChange={(e) => setSideB(e.target.value)} />
              <Label tone="dark" className="mt-3">{copy.create.oddsB}</Label>
              <Input
                tone="dark"
                type="number"
                min={1}
                step={0.01}
                value={oddsB}
                onChange={(e) => setOddsB(e.target.value)}
                mono
              />
            </div>
          </div>
          <div className="mt-4">
            <Label tone="dark">{copy.create.referenceStake}</Label>
            <Input
              tone="dark"
              type="number"
              min={1}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              mono
            />
          </div>
        </div>

        <div>
          <Label tone="dark">{copy.common.mySide}</Label>
          <SideSelector
            side={mySide}
            setSide={setMySide}
            bet={{ sideA: sideA || "A", sideB: sideB || "B" }}
            tone="dark"
          />
        </div>

        <div>
          <Label tone="dark">{copy.create.inviteFriends}</Label>
          {friends.length === 0 ? (
            <p className="font-mono text-xs text-ink-dim italic">
              {copy.create.noFriends}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {friends.map((friend, i) => {
                const checked = invitedUserIds.includes(friend.id);
                const palette = FRIEND_BUTTON_PALETTE[i % FRIEND_BUTTON_PALETTE.length];
                return (
                  <button
                    type="button"
                    key={friend.id}
                    onClick={() => toggleInvite(friend.id)}
                    style={
                      checked
                        ? ({
                            backgroundColor: palette.activeBg,
                            borderColor: palette.activeBorder,
                            color: palette.activeText,
                            "--press-shadow": palette.shadow,
                            "--press-depth": "2px"
                          } as PressableInlineStyle)
                        : ({
                            backgroundColor: palette.bg,
                            borderColor: palette.border,
                            color: palette.text,
                            "--press-shadow": "rgba(38, 52, 92, 0.16)",
                            "--press-depth": "2px"
                          } as PressableInlineStyle)
                    }
                    className={cn(
                      "pressable flex items-center gap-2.5 p-3 rounded-lg border transition-colors text-left",
                      checked && "font-bold"
                    )}
                  >
                    <span
                      className={cn(
                        "w-8 h-8 rounded-lg grid place-items-center font-display text-xs shrink-0",
                        checked ? "bg-white/25" : "bg-white/40"
                      )}
                    >
                      {initials(friend.username)}
                    </span>
                    <span className="text-sm font-medium truncate">{friend.username}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button variant="primary" size="lg" disabled={busy} type="submit" className="w-full">
          <Send className="w-4 h-4" />
          {copy.create.submit}
        </Button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FriendsView
   ───────────────────────────────────────────── */

function FriendsView({
  friends,
  token,
  onRefresh,
  onError,
  onToast
}: {
  friends: FriendsResponse;
  token: string;
  onRefresh: () => Promise<void>;
  onError: (error: unknown) => void;
  onToast: (message: string) => void;
}) {
  const copy = useCopy();
  const [identifier, setIdentifier] = useState("");

  const addFriend = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest<FriendRequest>("/api/friends", token, {
        method: "POST",
        body: { identifier }
      });
      setIdentifier("");
      onToast(copy.friends.inviteSent);
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  const accept = async (id: string) => {
    try {
      await apiRequest<FriendsResponse>(`/api/friends/${id}/accept`, token, { method: "POST" });
      onToast(copy.friends.inviteAccepted);
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiRequest<FriendsResponse>(`/api/friends/${id}`, token, { method: "DELETE" });
      onToast(copy.friends.inviteRemoved);
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  return (
    <div className="space-y-10">
      <Section
        eyebrow={copy.friends.addEyebrow}
        title={copy.friends.addTitle}
        icon={<UserPlus className="w-4 h-4" />}
      >
        <CardDark className="!p-6 !bg-lime/25">
          <form onSubmit={addFriend} className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label tone="dark">{copy.friends.identifier}</Label>
              <Input
                tone="dark"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="paulo, marie, contact@..."
              />
            </div>
            <Button variant="ember" type="submit">
              <Send className="w-4 h-4" />
              {copy.friends.send}
            </Button>
          </form>
        </CardDark>
      </Section>

      <Section
        eyebrow={copy.friends.incomingEyebrow}
        title={copy.friends.incomingTitle}
        icon={<Bell className="w-4 h-4" />}
        count={friends.incoming.length}
        empty={friends.incoming.length === 0 ? copy.friends.incomingEmpty : undefined}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {friends.incoming.map((request, i) => (
            <CardDark
              key={request.id}
              className="!p-4 flex items-center justify-between gap-3 rise"
              style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-rose/15 border border-rose/35 grid place-items-center font-display text-sm text-rose shrink-0">
                  {initials(request.user.username)}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base uppercase tracking-tight truncate">
                    {request.user.username}
                  </p>
                  <p className="font-mono text-[10px] text-ink-dim tracking-[0.16em] uppercase">
                    {copy.friends.wantsIn}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="primary" size="sm" onClick={() => accept(request.id)}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(request.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardDark>
          ))}
        </div>
      </Section>

      <Section
        eyebrow={copy.friends.outgoingEyebrow}
        title={copy.friends.outgoingTitle}
        icon={<Send className="w-4 h-4" />}
        count={friends.outgoing.length}
        empty={friends.outgoing.length === 0 ? copy.friends.outgoingEmpty : undefined}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {friends.outgoing.map((request) => (
            <CardDark key={request.id} className="!p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-ember/30 border border-ember-deep/30 grid place-items-center font-display text-sm text-ember-deep shrink-0">
                  {initials(request.user.username)}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base uppercase tracking-tight truncate">
                    {request.user.username}
                  </p>
                  <p className="font-mono text-[10px] text-amber tracking-[0.16em] uppercase">
                    {copy.friends.pending}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(request.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </CardDark>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="// roster"
        title={copy.friends.rosterTitle}
        icon={<Users className="w-4 h-4" />}
        count={friends.friends.length}
        empty={friends.friends.length === 0 ? copy.friends.rosterEmpty : undefined}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {friends.friends.map((friend, i) => {
            const palette = FRIEND_BUTTON_PALETTE[i % FRIEND_BUTTON_PALETTE.length];
            return (
            <div
              key={friend.id}
              className="ticket ticket-dark !p-4 text-center rise"
              style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties}
            >
              <div className="relative mx-auto w-14 h-14">
                <div
                  className="relative w-14 h-14 rounded-xl border grid place-items-center font-display text-xl shadow-[3px_3px_0_rgba(38,52,92,0.18)]"
                  style={{
                    backgroundColor: palette.activeBg,
                    borderColor: palette.activeBorder,
                    color: palette.activeText
                  }}
                >
                  {initials(friend.username)}
                </div>
              </div>
              <p className="mt-3 font-display text-base uppercase tracking-tight truncate">
                {friend.username}
              </p>
              <p className="font-mono text-[10px] text-ink-dim tracking-[0.16em] uppercase">
                {copy.common.member}
              </p>
            </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DebtsView
   ───────────────────────────────────────────── */

function DebtsView({
  debts,
  token,
  onRefresh,
  onError
}: {
  debts: DebtsResponse;
  token: string;
  onRefresh: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const copy = useCopy();
  const settle = async (debtId: string) => {
    try {
      await apiRequest<Debt>(`/api/debts/${debtId}/settle`, token, { method: "POST" });
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  };

  const totalOwe = debts.iOwe.reduce((sum, d) => (d.status === "open" ? sum + d.amount : sum), 0);
  const totalOwed = debts.owedToMe.reduce((sum, d) => (d.status === "open" ? sum + d.amount : sum), 0);
  const net = totalOwed - totalOwe;

  return (
    <div className="space-y-8">
      {/* SCOREBOARD */}
      <header className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ScoreCard
          eyebrow={copy.debts.oweEyebrow}
          value={totalOwe}
          color="ember"
          icon={<ArrowUpRight className="w-4 h-4" />}
        />
        <ScoreCard
          eyebrow={copy.debts.owedEyebrow}
          value={totalOwed}
          color="lime"
          icon={<ArrowDownRight className="w-4 h-4" />}
        />
        <ScoreCard
          eyebrow={copy.debts.balanceEyebrow}
          value={net}
          color={net >= 0 ? "jade" : "rose"}
          icon={<CircleDollarSign className="w-4 h-4" />}
          signed
        />
      </header>

      <Section
        eyebrow={copy.debts.passiveEyebrow}
        title={copy.debts.oweTitle}
        icon={<ArrowUpRight className="w-4 h-4" />}
        count={debts.iOwe.length}
        empty={debts.iOwe.length === 0 ? copy.debts.oweEmpty : undefined}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {debts.iOwe.map((debt, i) => (
            <DebtCard
              debt={debt}
              key={debt.id}
              mode="owe"
              onSettle={settle}
              delay={i * 60}
            />
          ))}
        </div>
      </Section>

      <Section
        eyebrow={copy.debts.activeEyebrow}
        title={copy.debts.owedTitle}
        icon={<ArrowDownRight className="w-4 h-4" />}
        count={debts.owedToMe.length}
        empty={debts.owedToMe.length === 0 ? copy.debts.owedEmpty : undefined}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {debts.owedToMe.map((debt, i) => (
            <DebtCard
              debt={debt}
              key={debt.id}
              mode="owed"
              onSettle={settle}
              delay={i * 60}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

function ScoreCard({
  eyebrow,
  value,
  color,
  icon,
  signed = false
}: {
  eyebrow: string;
  value: number;
  color: "ember" | "lime" | "jade" | "rose";
  icon: ReactNode;
  signed?: boolean;
}) {
  const copy = useCopy();
  const colorClass =
    color === "ember"
      ? "text-ember-deep"
      : color === "lime"
        ? "text-lime-dark"
        : color === "jade"
          ? "text-jade"
          : "text-rose";
  const cardClass =
    color === "ember"
      ? "!bg-ember/20 !border-ember-deep/25"
      : color === "lime"
        ? "!bg-lime/35 !border-lime-deep/35"
        : color === "jade"
          ? "!bg-iris/15 !border-iris/35"
          : "!bg-rose/10 !border-rose/30";
  const iconClass =
    color === "ember"
      ? "bg-ember/35 border-ember-deep/30"
      : color === "lime"
        ? "bg-lime/55 border-lime-deep/35"
        : color === "jade"
          ? "bg-iris/20 border-iris/35"
          : "bg-rose/15 border-rose/35";
  return (
    <CardDark className={cn("!p-5 flex items-center justify-between gap-3", cardClass)}>
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-dim">{eyebrow}</p>
        <p className={cn("numframe text-4xl mt-1", colorClass)}>
          {signed && value > 0 ? "+" : ""}
          {value}
          <span className="font-mono text-xs text-ink-dim tracking-[0.18em] uppercase ml-1.5">
            {copy.common.points}
          </span>
        </p>
      </div>
      <div className={cn("w-12 h-12 rounded-xl border grid place-items-center", colorClass, iconClass)}>
        {icon}
      </div>
    </CardDark>
  );
}

function DebtCard({
  debt,
  mode,
  onSettle,
  delay = 0
}: {
  debt: Debt;
  mode: "owe" | "owed";
  onSettle: (debtId: string) => void;
  delay?: number;
}) {
  const copy = useCopy();
  const settled = debt.status === "settled";
  const accentColor = mode === "owe" ? "text-ember-deep" : "text-iris-dark";

  return (
    <Card
      className={cn("flex flex-col gap-3 rise", settled && "opacity-70")}
      style={{ animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow-ink">
            {mode === "owe" ? copy.debts.youOwe : copy.debts.owesYou}
          </p>
          <p className="font-display text-lg uppercase tracking-tight truncate mt-0.5">
            {mode === "owe" ? debt.creditorUsername : debt.debtorUsername}
          </p>
        </div>
        {settled ? (
          <Badge tone="done" align="flat">
            <Check className="w-3 h-3" />
            {copy.debts.settled}
          </Badge>
        ) : (
          <Badge tone="live" align="flat">
            <Flame className="w-3 h-3" />
            {copy.debts.open}
          </Badge>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ticket-ink-dim">
            {copy.common.amount}
          </p>
          <p className={cn("numframe text-5xl", accentColor)}>
            {debt.amount}
            <span className="font-mono text-xs text-ticket-ink-dim tracking-[0.18em] uppercase ml-1.5">
              {copy.common.points}
            </span>
          </p>
        </div>
        <div className="vs-badge" style={{ transform: "rotate(8deg) scale(0.7)" }}>
          {mode === "owe" ? "←" : "→"}
        </div>
      </div>

      <div className="perforation" />

      <p className="font-mono text-xs text-ticket-ink-dim truncate">
        {copy.debts.ticketPrefix} <span className="text-ticket-ink">{debt.betTitle}</span>
      </p>

      {!settled && (
        <Button variant="ink" onClick={() => onSettle(debt.id)} className="w-full">
          <Check className="w-4 h-4" />
          {copy.debts.settle}
        </Button>
      )}
    </Card>
  );
}
