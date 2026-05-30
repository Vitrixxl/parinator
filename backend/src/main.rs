use async_trait::async_trait;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        FromRequestParts, Path, Query, State,
    },
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    FromRow, SqlitePool,
};
use std::{env, path::PathBuf, str::FromStr, sync::Arc};
use tokio::sync::broadcast;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
    jwt_secret: Arc<String>,
    events: broadcast::Sender<EventEnvelope>,
    static_dir: Arc<PathBuf>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "parinator_api=debug,tower_http=info".into()),
        )
        .init();

    let database_url =
        env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://parinator.db".to_string());
    let connect_options = SqliteConnectOptions::from_str(&database_url)?
        .create_if_missing(true)
        .foreign_keys(true);
    let db = SqlitePoolOptions::new()
        .max_connections(8)
        .connect_with(connect_options)
        .await?;
    migrate(&db).await?;

    let static_dir =
        env::var("STATIC_DIR").unwrap_or_else(|_| format!("{}/public", env!("CARGO_MANIFEST_DIR")));
    let (events, _) = broadcast::channel(512);
    let state = AppState {
        db,
        jwt_secret: Arc::new(
            env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-me-before-production".to_string()),
        ),
        events,
        static_dir: Arc::new(PathBuf::from(&static_dir)),
    };

    let api = Router::new()
        .route("/health", get(health))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/me", get(me))
        .route("/friends", get(list_friends).post(request_friend))
        .route("/friends/:id/accept", post(accept_friend))
        .route("/friends/:id", delete(remove_friendship))
        .route("/bets", get(list_bets).post(create_bet))
        .route("/bets/:id", get(get_bet))
        .route("/bets/:id/invite", post(invite_to_bet))
        .route("/bets/:id/respond", post(respond_to_bet))
        .route("/bets/:id/resolve", post(resolve_bet))
        .route("/bets/share/:code", get(get_shared_bet))
        .route("/bets/join/:code", post(join_shared_bet))
        .route("/debts", get(list_debts))
        .route("/debts/:id/settle", post(settle_debt))
        .fallback(api_not_found);

    let app = Router::new()
        .nest("/api", api)
        .route("/ws", get(websocket_handler))
        .nest_service("/assets", ServeDir::new(format!("{static_dir}/assets")))
        .route("/", get(spa_index))
        .fallback(spa_index)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = env::var("API_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("API listening on http://{addr}");
    tracing::info!("serving frontend from {static_dir}");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn migrate(db: &SqlitePool) -> anyhow::Result<()> {
    let statements = [
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            username_key TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            email_key TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS friendships (
            id TEXT PRIMARY KEY,
            requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(requester_id, addressee_id),
            CHECK(requester_id <> addressee_id)
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS bets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            initiator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            side_a TEXT NOT NULL,
            side_b TEXT NOT NULL,
            odds_a REAL NOT NULL CHECK (odds_a >= 1),
            odds_b REAL NOT NULL CHECK (odds_b >= 1),
            stake INTEGER NOT NULL CHECK (stake > 0),
            winning_side TEXT CHECK (winning_side IN ('A', 'B')),
            status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
            share_code TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            resolved_at TEXT
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS bet_participants (
            id TEXT PRIMARY KEY,
            bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            side TEXT CHECK (side IN ('A', 'B')),
            amount INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
            status TEXT NOT NULL CHECK (status IN ('invited', 'accepted', 'declined')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(bet_id, user_id)
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY,
            bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
            debtor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            creditor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL CHECK (amount > 0),
            status TEXT NOT NULL CHECK (status IN ('open', 'settled')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            settled_at TEXT,
            UNIQUE(bet_id, debtor_id, creditor_id),
            CHECK(debtor_id <> creditor_id)
        )
        "#,
        "CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id)",
        "CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id)",
        "CREATE INDEX IF NOT EXISTS idx_bet_participants_user ON bet_participants(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_debts_debtor ON debts(debtor_id)",
        "CREATE INDEX IF NOT EXISTS idx_debts_creditor ON debts(creditor_id)",
    ];

    for statement in statements {
        sqlx::query(statement).execute(db).await?;
    }
    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        service: "parinator-api",
    })
}

async fn api_not_found() -> ApiError {
    ApiError::not_found("Endpoint API introuvable.")
}

async fn spa_index(State(state): State<AppState>) -> Result<Html<String>, ApiError> {
    let index_path = state.static_dir.join("index.html");
    let index = tokio::fs::read_to_string(&index_path)
        .await
        .map_err(|error| {
            tracing::error!(?error, path = %index_path.display(), "frontend index not found");
            ApiError::not_found("Frontend non buildé. Lance `cd frontend && bun run build`.")
        })?;
    Ok(Html(index))
}

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
    service: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    message: String,
}

#[derive(Debug)]
struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, message)
    }

    fn forbidden(message: impl Into<String>) -> Self {
        Self::new(StatusCode::FORBIDDEN, message)
    }

    fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    fn conflict(message: impl Into<String>) -> Self {
        Self::new(StatusCode::CONFLICT, message)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ErrorBody {
                message: self.message,
            }),
        )
            .into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        tracing::error!(?error, "database error");
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, "Erreur serveur.")
    }
}

impl From<bcrypt::BcryptError> for ApiError {
    fn from(error: bcrypt::BcryptError) -> Self {
        tracing::error!(?error, "password hashing error");
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, "Erreur serveur.")
    }
}

type ApiResult<T> = Result<Json<T>, ApiError>;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

#[derive(Clone)]
struct AuthUser {
    id: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or_else(|| ApiError::unauthorized("Authentification requise."))?;

        let user_id = verify_token(token, state.jwt_secret.as_str())?;
        Ok(Self { id: user_id })
    }
}

fn token_for(user_id: &str, secret: &str) -> Result<String, ApiError> {
    let exp = Utc::now()
        .checked_add_signed(Duration::days(30))
        .ok_or_else(|| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "Erreur serveur."))?
        .timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        exp,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|error| {
        tracing::error!(?error, "jwt encode error");
        ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "Erreur serveur.")
    })
}

fn verify_token(token: &str, secret: &str) -> Result<String, ApiError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims.sub)
    .map_err(|_| ApiError::unauthorized("Session invalide ou expirée."))
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct UserPublic {
    id: String,
    username: String,
    email: String,
    created_at: String,
}

#[derive(Debug, FromRow)]
struct UserAuthRow {
    id: String,
    username: String,
    email: String,
    password_hash: String,
    created_at: String,
}

impl From<UserAuthRow> for UserPublic {
    fn from(user: UserAuthRow) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthResponse {
    token: String,
    user: UserPublic,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegisterInput {
    username: String,
    email: String,
    password: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoginInput {
    identifier: String,
    password: String,
}

async fn register(
    State(state): State<AppState>,
    Json(input): Json<RegisterInput>,
) -> ApiResult<AuthResponse> {
    let username = input.username.trim().to_string();
    let username_key = normalize_username(&username)?;
    let email = input.email.trim().to_string();
    let email_key = normalize_email(&email)?;
    validate_password(&input.password)?;

    let existing = sqlx::query_scalar::<_, String>(
        "SELECT id FROM users WHERE username_key = ? OR email_key = ? LIMIT 1",
    )
    .bind(&username_key)
    .bind(&email_key)
    .fetch_optional(&state.db)
    .await?;
    if existing.is_some() {
        return Err(ApiError::conflict(
            "Ce pseudo ou cette adresse mail existe déjà.",
        ));
    }

    let user_id = Uuid::new_v4().to_string();
    let password_hash = hash(input.password, DEFAULT_COST)?;
    let insert_result = sqlx::query(
        r#"
        INSERT INTO users (id, username, username_key, email, email_key, password_hash)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&user_id)
    .bind(&username)
    .bind(&username_key)
    .bind(&email)
    .bind(&email_key)
    .bind(password_hash)
    .execute(&state.db)
    .await;

    if let Err(error) = insert_result {
        if is_unique_constraint(&error) {
            return Err(ApiError::conflict(
                "Ce pseudo ou cette adresse mail existe déjà.",
            ));
        }
        return Err(error.into());
    }

    let user = get_user_public(&state.db, &user_id).await?;
    let token = token_for(&user_id, state.jwt_secret.as_str())?;
    Ok(Json(AuthResponse { token, user }))
}

async fn login(
    State(state): State<AppState>,
    Json(input): Json<LoginInput>,
) -> ApiResult<AuthResponse> {
    let identifier = input.identifier.trim().to_lowercase();
    if identifier.is_empty() {
        return Err(ApiError::bad_request("Identifiant requis."));
    }

    let user = sqlx::query_as::<_, UserAuthRow>(
        r#"
        SELECT id, username, email, password_hash, created_at
        FROM users
        WHERE username_key = ? OR email_key = ?
        LIMIT 1
        "#,
    )
    .bind(&identifier)
    .bind(&identifier)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| ApiError::unauthorized("Identifiants invalides."))?;

    if !verify(input.password, &user.password_hash)? {
        return Err(ApiError::unauthorized("Identifiants invalides."));
    }

    let token = token_for(&user.id, state.jwt_secret.as_str())?;
    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}

async fn me(State(state): State<AppState>, auth: AuthUser) -> ApiResult<UserPublic> {
    Ok(Json(get_user_public(&state.db, &auth.id).await?))
}

fn normalize_username(username: &str) -> Result<String, ApiError> {
    if username.len() < 3 || username.len() > 24 {
        return Err(ApiError::bad_request(
            "Le pseudo doit contenir entre 3 et 24 caractères.",
        ));
    }
    if !username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err(ApiError::bad_request(
            "Le pseudo accepte uniquement lettres, chiffres, tirets et underscores.",
        ));
    }
    Ok(username.to_lowercase())
}

fn normalize_email(email: &str) -> Result<String, ApiError> {
    let email_key = email.to_lowercase();
    if email_key.len() < 6 || !email_key.contains('@') || !email_key.contains('.') {
        return Err(ApiError::bad_request("Adresse mail invalide."));
    }
    Ok(email_key)
}

fn validate_password(password: &str) -> Result<(), ApiError> {
    if password.len() < 8 {
        return Err(ApiError::bad_request(
            "Le mot de passe doit contenir au moins 8 caractères.",
        ));
    }
    Ok(())
}

fn is_unique_constraint(error: &sqlx::Error) -> bool {
    matches!(error, sqlx::Error::Database(db_error) if db_error.is_unique_violation())
}

async fn get_user_public(db: &SqlitePool, user_id: &str) -> Result<UserPublic, ApiError> {
    sqlx::query_as::<_, UserPublic>(
        "SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| ApiError::not_found("Utilisateur introuvable."))
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RealtimeEvent {
    kind: String,
    message: String,
    bet_id: Option<String>,
    friendship_id: Option<String>,
    debt_id: Option<String>,
    actor: Option<UserPublic>,
    created_at: String,
}

#[derive(Clone)]
struct EventEnvelope {
    recipients: Vec<String>,
    event: RealtimeEvent,
}

fn emit_event(
    state: &AppState,
    recipients: Vec<String>,
    kind: &str,
    message: impl Into<String>,
    actor: Option<UserPublic>,
    bet_id: Option<String>,
    friendship_id: Option<String>,
    debt_id: Option<String>,
) {
    let _ = state.events.send(EventEnvelope {
        recipients,
        event: RealtimeEvent {
            kind: kind.to_string(),
            message: message.into(),
            bet_id,
            friendship_id,
            debt_id,
            actor,
            created_at: Utc::now().to_rfc3339(),
        },
    });
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FriendsResponse {
    friends: Vec<UserPublic>,
    incoming: Vec<FriendRequest>,
    outgoing: Vec<FriendRequest>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FriendRequest {
    id: String,
    user: UserPublic,
    status: String,
    created_at: String,
}

#[derive(FromRow)]
struct FriendRequestRow {
    id: String,
    user_id: String,
    username: String,
    email: String,
    user_created_at: String,
    status: String,
    created_at: String,
}

impl From<FriendRequestRow> for FriendRequest {
    fn from(row: FriendRequestRow) -> Self {
        Self {
            id: row.id,
            user: UserPublic {
                id: row.user_id,
                username: row.username,
                email: row.email,
                created_at: row.user_created_at,
            },
            status: row.status,
            created_at: row.created_at,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FriendRequestInput {
    identifier: String,
}

async fn list_friends(State(state): State<AppState>, auth: AuthUser) -> ApiResult<FriendsResponse> {
    let friends = sqlx::query_as::<_, UserPublic>(
        r#"
        SELECT u.id, u.username, u.email, u.created_at
        FROM friendships f
        JOIN users u ON u.id = CASE
            WHEN f.requester_id = ? THEN f.addressee_id
            ELSE f.requester_id
        END
        WHERE (f.requester_id = ? OR f.addressee_id = ?)
          AND f.status = 'accepted'
        ORDER BY u.username COLLATE NOCASE
        "#,
    )
    .bind(&auth.id)
    .bind(&auth.id)
    .bind(&auth.id)
    .fetch_all(&state.db)
    .await?;

    let incoming = sqlx::query_as::<_, FriendRequestRow>(
        r#"
        SELECT f.id, u.id AS user_id, u.username, u.email, u.created_at AS user_created_at,
               f.status, f.created_at
        FROM friendships f
        JOIN users u ON u.id = f.requester_id
        WHERE f.addressee_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
        "#,
    )
    .bind(&auth.id)
    .fetch_all(&state.db)
    .await?
    .into_iter()
    .map(FriendRequest::from)
    .collect();

    let outgoing = sqlx::query_as::<_, FriendRequestRow>(
        r#"
        SELECT f.id, u.id AS user_id, u.username, u.email, u.created_at AS user_created_at,
               f.status, f.created_at
        FROM friendships f
        JOIN users u ON u.id = f.addressee_id
        WHERE f.requester_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
        "#,
    )
    .bind(&auth.id)
    .fetch_all(&state.db)
    .await?
    .into_iter()
    .map(FriendRequest::from)
    .collect();

    Ok(Json(FriendsResponse {
        friends,
        incoming,
        outgoing,
    }))
}

async fn request_friend(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(input): Json<FriendRequestInput>,
) -> ApiResult<FriendRequest> {
    let identifier = input.identifier.trim().to_lowercase();
    if identifier.is_empty() {
        return Err(ApiError::bad_request("Pseudo ou mail requis."));
    }

    let target = sqlx::query_as::<_, UserPublic>(
        r#"
        SELECT id, username, email, created_at
        FROM users
        WHERE username_key = ? OR email_key = ?
        LIMIT 1
        "#,
    )
    .bind(&identifier)
    .bind(&identifier)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| ApiError::not_found("Utilisateur introuvable."))?;

    if target.id == auth.id {
        return Err(ApiError::bad_request("Tu ne peux pas t'ajouter toi-même."));
    }

    let existing = sqlx::query_as::<_, FriendshipStatusRow>(
        r#"
        SELECT requester_id, addressee_id, status
        FROM friendships
        WHERE (requester_id = ? AND addressee_id = ?)
           OR (requester_id = ? AND addressee_id = ?)
        LIMIT 1
        "#,
    )
    .bind(&auth.id)
    .bind(&target.id)
    .bind(&target.id)
    .bind(&auth.id)
    .fetch_optional(&state.db)
    .await?;

    if let Some(friendship) = existing {
        if friendship.status == "accepted" {
            return Err(ApiError::conflict("Vous êtes déjà amis."));
        }
        if friendship.requester_id == auth.id {
            return Err(ApiError::conflict("Invitation déjà envoyée."));
        }
        return Err(ApiError::conflict(
            "Cette personne t'a déjà envoyé une invitation.",
        ));
    }

    let friendship_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO friendships (id, requester_id, addressee_id, status)
        VALUES (?, ?, ?, 'pending')
        "#,
    )
    .bind(&friendship_id)
    .bind(&auth.id)
    .bind(&target.id)
    .execute(&state.db)
    .await?;

    let actor = get_user_public(&state.db, &auth.id).await?;
    emit_event(
        &state,
        vec![target.id.clone()],
        "friend_invite",
        format!("{} t'a ajouté en ami.", actor.username),
        Some(actor),
        None,
        Some(friendship_id.clone()),
        None,
    );

    Ok(Json(FriendRequest {
        id: friendship_id,
        user: target,
        status: "pending".to_string(),
        created_at: Utc::now().to_rfc3339(),
    }))
}

#[derive(FromRow)]
struct FriendshipStatusRow {
    requester_id: String,
    addressee_id: String,
    status: String,
}

async fn accept_friend(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(friendship_id): Path<String>,
) -> ApiResult<FriendsResponse> {
    let friendship = friendship_for_user(&state.db, &friendship_id, &auth.id).await?;
    if friendship.addressee_id != auth.id || friendship.status != "pending" {
        return Err(ApiError::forbidden("Invitation non modifiable."));
    }

    sqlx::query(
        r#"
        UPDATE friendships
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&friendship_id)
    .execute(&state.db)
    .await?;

    let actor = get_user_public(&state.db, &auth.id).await?;
    emit_event(
        &state,
        vec![friendship.requester_id],
        "friend_accepted",
        format!("{} a accepté ton invitation.", actor.username),
        Some(actor),
        None,
        Some(friendship_id),
        None,
    );

    list_friends(State(state), auth).await
}

async fn remove_friendship(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(friendship_id): Path<String>,
) -> ApiResult<FriendsResponse> {
    let friendship = friendship_for_user(&state.db, &friendship_id, &auth.id).await?;
    sqlx::query("DELETE FROM friendships WHERE id = ?")
        .bind(&friendship_id)
        .execute(&state.db)
        .await?;

    let other_id = if friendship.requester_id == auth.id {
        friendship.addressee_id
    } else {
        friendship.requester_id
    };
    let actor = get_user_public(&state.db, &auth.id).await?;
    emit_event(
        &state,
        vec![other_id],
        "friend_removed",
        "Relation d'ami mise à jour.",
        Some(actor),
        None,
        Some(friendship_id),
        None,
    );

    list_friends(State(state), auth).await
}

async fn friendship_for_user(
    db: &SqlitePool,
    friendship_id: &str,
    user_id: &str,
) -> Result<FriendshipStatusRow, ApiError> {
    sqlx::query_as::<_, FriendshipStatusRow>(
        r#"
        SELECT requester_id, addressee_id, status
        FROM friendships
        WHERE id = ? AND (requester_id = ? OR addressee_id = ?)
        LIMIT 1
        "#,
    )
    .bind(friendship_id)
    .bind(user_id)
    .bind(user_id)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| ApiError::not_found("Invitation introuvable."))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BetsResponse {
    mine: Vec<BetResponse>,
    friends: Vec<BetResponse>,
}

#[derive(Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct BetParticipant {
    id: String,
    user_id: String,
    username: String,
    side: Option<String>,
    amount: i64,
    status: String,
    created_at: String,
}

#[derive(Clone, FromRow)]
struct BetRow {
    id: String,
    title: String,
    description: Option<String>,
    initiator_id: String,
    initiator_username: String,
    side_a: String,
    side_b: String,
    odds_a: f64,
    odds_b: f64,
    stake: i64,
    winning_side: Option<String>,
    status: String,
    share_code: String,
    created_at: String,
    resolved_at: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BetResponse {
    id: String,
    title: String,
    description: Option<String>,
    initiator_id: String,
    initiator_username: String,
    side_a: String,
    side_b: String,
    odds_a: f64,
    odds_b: f64,
    stake: i64,
    winning_side: Option<String>,
    status: String,
    share_code: String,
    created_at: String,
    resolved_at: Option<String>,
    participants: Vec<BetParticipant>,
}

impl BetResponse {
    fn from_row(row: BetRow, participants: Vec<BetParticipant>) -> Self {
        Self {
            id: row.id,
            title: row.title,
            description: row.description,
            initiator_id: row.initiator_id,
            initiator_username: row.initiator_username,
            side_a: row.side_a,
            side_b: row.side_b,
            odds_a: row.odds_a,
            odds_b: row.odds_b,
            stake: row.stake,
            winning_side: row.winning_side,
            status: row.status,
            share_code: row.share_code,
            created_at: row.created_at,
            resolved_at: row.resolved_at,
            participants,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateBetInput {
    title: String,
    description: Option<String>,
    side_a: String,
    side_b: String,
    odds_a: f64,
    odds_b: f64,
    stake: i64,
    my_side: String,
    invited_user_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InviteBetInput {
    user_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BetRespondInput {
    accept: bool,
    side: Option<String>,
    amount: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResolveBetInput {
    winning_side: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JoinSharedBetInput {
    side: String,
    amount: i64,
}

async fn list_bets(State(state): State<AppState>, auth: AuthUser) -> ApiResult<BetsResponse> {
    let mine_rows = sqlx::query_as::<_, BetRow>(
        r#"
        SELECT DISTINCT b.*, u.username AS initiator_username
        FROM bets b
        JOIN users u ON u.id = b.initiator_id
        JOIN bet_participants bp ON bp.bet_id = b.id
        WHERE bp.user_id = ?
        ORDER BY CASE b.status WHEN 'open' THEN 0 ELSE 1 END, b.created_at DESC
        "#,
    )
    .bind(&auth.id)
    .fetch_all(&state.db)
    .await?;

    let friend_rows = sqlx::query_as::<_, BetRow>(
        r#"
        WITH my_friends AS (
            SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS id
            FROM friendships
            WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
        )
        SELECT DISTINCT b.*, u.username AS initiator_username
        FROM bets b
        JOIN users u ON u.id = b.initiator_id
        JOIN bet_participants bp ON bp.bet_id = b.id
        WHERE bp.user_id IN (SELECT id FROM my_friends)
          AND b.id NOT IN (SELECT bet_id FROM bet_participants WHERE user_id = ?)
        ORDER BY CASE b.status WHEN 'open' THEN 0 ELSE 1 END, b.created_at DESC
        LIMIT 80
        "#,
    )
    .bind(&auth.id)
    .bind(&auth.id)
    .bind(&auth.id)
    .bind(&auth.id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(BetsResponse {
        mine: hydrate_bets(&state.db, mine_rows).await?,
        friends: hydrate_bets(&state.db, friend_rows).await?,
    }))
}

async fn get_bet(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(bet_id): Path<String>,
) -> ApiResult<BetResponse> {
    ensure_bet_visible(&state.db, &auth.id, &bet_id).await?;
    Ok(Json(get_bet_response(&state.db, &bet_id).await?))
}

async fn get_shared_bet(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> ApiResult<BetResponse> {
    let bet_id =
        sqlx::query_scalar::<_, String>("SELECT id FROM bets WHERE share_code = ? LIMIT 1")
            .bind(code)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| ApiError::not_found("Pari introuvable."))?;
    Ok(Json(get_bet_response(&state.db, &bet_id).await?))
}

async fn create_bet(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(input): Json<CreateBetInput>,
) -> ApiResult<BetResponse> {
    validate_bet_input(
        &input.title,
        &input.side_a,
        &input.side_b,
        input.odds_a,
        input.odds_b,
        input.stake,
        &input.my_side,
    )?;

    let invitees = unique_user_ids(input.invited_user_ids, &auth.id);
    for invitee_id in &invitees {
        ensure_friend(&state.db, &auth.id, invitee_id).await?;
    }

    let bet_id = Uuid::new_v4().to_string();
    let share_code = Uuid::new_v4()
        .simple()
        .to_string()
        .chars()
        .take(10)
        .collect::<String>();
    let description = input
        .description
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    sqlx::query(
        r#"
        INSERT INTO bets (
            id, title, description, initiator_id, side_a, side_b, odds_a, odds_b,
            stake, status, share_code
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
        "#,
    )
    .bind(&bet_id)
    .bind(input.title.trim())
    .bind(description)
    .bind(&auth.id)
    .bind(input.side_a.trim())
    .bind(input.side_b.trim())
    .bind(input.odds_a)
    .bind(input.odds_b)
    .bind(input.stake)
    .bind(&share_code)
    .execute(&state.db)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO bet_participants (id, bet_id, user_id, side, amount, status)
        VALUES (?, ?, ?, ?, ?, 'accepted')
        "#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&bet_id)
    .bind(&auth.id)
    .bind(normalize_side(&input.my_side)?)
    .bind(input.stake)
    .execute(&state.db)
    .await?;

    for invitee_id in &invitees {
        sqlx::query(
            r#"
            INSERT INTO bet_participants (id, bet_id, user_id, status)
            VALUES (?, ?, ?, 'invited')
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&bet_id)
        .bind(invitee_id)
        .execute(&state.db)
        .await?;
    }

    let actor = get_user_public(&state.db, &auth.id).await?;
    for invitee_id in &invitees {
        emit_event(
            &state,
            vec![invitee_id.clone()],
            "bet_invite",
            format!("{} t'a invité sur un pari.", actor.username),
            Some(actor.clone()),
            Some(bet_id.clone()),
            None,
            None,
        );
    }

    Ok(Json(get_bet_response(&state.db, &bet_id).await?))
}

async fn invite_to_bet(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(bet_id): Path<String>,
    Json(input): Json<InviteBetInput>,
) -> ApiResult<BetResponse> {
    let bet = get_bet_row(&state.db, &bet_id).await?;
    if bet.initiator_id != auth.id {
        return Err(ApiError::forbidden("Seul l'initiateur peut inviter."));
    }
    if bet.status != "open" {
        return Err(ApiError::bad_request("Ce pari est déjà terminé."));
    }

    let invitees = unique_user_ids(input.user_ids, &auth.id);
    let actor = get_user_public(&state.db, &auth.id).await?;
    for invitee_id in invitees {
        ensure_friend(&state.db, &auth.id, &invitee_id).await?;
        let exists = sqlx::query_scalar::<_, String>(
            "SELECT id FROM bet_participants WHERE bet_id = ? AND user_id = ? LIMIT 1",
        )
        .bind(&bet_id)
        .bind(&invitee_id)
        .fetch_optional(&state.db)
        .await?;

        if exists.is_none() {
            sqlx::query(
                r#"
                INSERT INTO bet_participants (id, bet_id, user_id, status)
                VALUES (?, ?, ?, 'invited')
                "#,
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&bet_id)
            .bind(&invitee_id)
            .execute(&state.db)
            .await?;
            emit_event(
                &state,
                vec![invitee_id],
                "bet_invite",
                format!("{} t'a invité sur un pari.", actor.username),
                Some(actor.clone()),
                Some(bet_id.clone()),
                None,
                None,
            );
        }
    }

    Ok(Json(get_bet_response(&state.db, &bet_id).await?))
}

async fn respond_to_bet(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(bet_id): Path<String>,
    Json(input): Json<BetRespondInput>,
) -> ApiResult<BetResponse> {
    let bet = get_bet_row(&state.db, &bet_id).await?;
    if bet.status != "open" {
        return Err(ApiError::bad_request("Ce pari est déjà terminé."));
    }

    let participant_id = sqlx::query_scalar::<_, String>(
        r#"
        SELECT id FROM bet_participants
        WHERE bet_id = ? AND user_id = ? AND status = 'invited'
        LIMIT 1
        "#,
    )
    .bind(&bet_id)
    .bind(&auth.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| ApiError::not_found("Invitation de pari introuvable."))?;

    let actor = get_user_public(&state.db, &auth.id).await?;
    if input.accept {
        let side = normalize_side(
            input
                .side
                .as_deref()
                .ok_or_else(|| ApiError::bad_request("Côté requis."))?,
        )?;
        let amount = input.amount.unwrap_or(bet.stake);
        if amount <= 0 {
            return Err(ApiError::bad_request("La mise doit être positive."));
        }
        sqlx::query(
            r#"
            UPDATE bet_participants
            SET side = ?, amount = ?, status = 'accepted', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(side)
        .bind(amount)
        .bind(participant_id)
        .execute(&state.db)
        .await?;
        emit_event(
            &state,
            vec![bet.initiator_id],
            "bet_accepted",
            format!("{} a rejoint ton pari.", actor.username),
            Some(actor),
            Some(bet_id.clone()),
            None,
            None,
        );
    } else {
        sqlx::query(
            r#"
            UPDATE bet_participants
            SET status = 'declined', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
        )
        .bind(participant_id)
        .execute(&state.db)
        .await?;
        emit_event(
            &state,
            vec![bet.initiator_id],
            "bet_declined",
            format!("{} a refusé ton pari.", actor.username),
            Some(actor),
            Some(bet_id.clone()),
            None,
            None,
        );
    }

    Ok(Json(get_bet_response(&state.db, &bet_id).await?))
}

async fn join_shared_bet(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(code): Path<String>,
    Json(input): Json<JoinSharedBetInput>,
) -> ApiResult<BetResponse> {
    let side = normalize_side(&input.side)?;
    if input.amount <= 0 {
        return Err(ApiError::bad_request("La mise doit être positive."));
    }

    let bet = sqlx::query_as::<_, BetRow>(
        r#"
        SELECT b.*, u.username AS initiator_username
        FROM bets b
        JOIN users u ON u.id = b.initiator_id
        WHERE b.share_code = ?
        LIMIT 1
        "#,
    )
    .bind(&code)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| ApiError::not_found("Pari introuvable."))?;

    if bet.status != "open" {
        return Err(ApiError::bad_request("Ce pari est déjà terminé."));
    }

    let existing = sqlx::query_scalar::<_, String>(
        "SELECT status FROM bet_participants WHERE bet_id = ? AND user_id = ? LIMIT 1",
    )
    .bind(&bet.id)
    .bind(&auth.id)
    .fetch_optional(&state.db)
    .await?;

    match existing.as_deref() {
        Some("accepted") => return Err(ApiError::conflict("Tu participes déjà à ce pari.")),
        Some(_) => {
            sqlx::query(
                r#"
                UPDATE bet_participants
                SET side = ?, amount = ?, status = 'accepted', updated_at = CURRENT_TIMESTAMP
                WHERE bet_id = ? AND user_id = ?
                "#,
            )
            .bind(side)
            .bind(input.amount)
            .bind(&bet.id)
            .bind(&auth.id)
            .execute(&state.db)
            .await?;
        }
        None => {
            sqlx::query(
                r#"
                INSERT INTO bet_participants (id, bet_id, user_id, side, amount, status)
                VALUES (?, ?, ?, ?, ?, 'accepted')
                "#,
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&bet.id)
            .bind(&auth.id)
            .bind(side)
            .bind(input.amount)
            .execute(&state.db)
            .await?;
        }
    }

    let actor = get_user_public(&state.db, &auth.id).await?;
    emit_event(
        &state,
        vec![bet.initiator_id],
        "bet_joined",
        format!("{} a rejoint ton pari partagé.", actor.username),
        Some(actor),
        Some(bet.id.clone()),
        None,
        None,
    );

    Ok(Json(get_bet_response(&state.db, &bet.id).await?))
}

async fn resolve_bet(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(bet_id): Path<String>,
    Json(input): Json<ResolveBetInput>,
) -> ApiResult<BetResponse> {
    let winning_side = normalize_side(&input.winning_side)?;
    let bet = get_bet_row(&state.db, &bet_id).await?;
    if bet.initiator_id != auth.id {
        return Err(ApiError::forbidden(
            "Seul l'initiateur peut choisir le gagnant.",
        ));
    }
    if bet.status != "open" {
        return Err(ApiError::bad_request("Ce pari est déjà terminé."));
    }

    sqlx::query(
        r#"
        UPDATE bets
        SET status = 'resolved', winning_side = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&winning_side)
    .bind(&bet_id)
    .execute(&state.db)
    .await?;

    sqlx::query("DELETE FROM debts WHERE bet_id = ?")
        .bind(&bet_id)
        .execute(&state.db)
        .await?;
    create_debts_for_result(&state.db, &bet, &winning_side).await?;

    let participants = participant_user_ids(&state.db, &bet_id).await?;
    let actor = get_user_public(&state.db, &auth.id).await?;
    emit_event(
        &state,
        participants,
        "bet_resolved",
        format!("{} a déclaré le résultat du pari.", actor.username),
        Some(actor),
        Some(bet_id.clone()),
        None,
        None,
    );

    Ok(Json(get_bet_response(&state.db, &bet_id).await?))
}

fn validate_bet_input(
    title: &str,
    side_a: &str,
    side_b: &str,
    odds_a: f64,
    odds_b: f64,
    stake: i64,
    my_side: &str,
) -> Result<(), ApiError> {
    if title.trim().len() < 3 {
        return Err(ApiError::bad_request("Titre de pari trop court."));
    }
    if side_a.trim().is_empty() || side_b.trim().is_empty() {
        return Err(ApiError::bad_request("Les deux côtés sont requis."));
    }
    if odds_a < 1.0 || odds_b < 1.0 {
        return Err(ApiError::bad_request(
            "Les cotes doivent être supérieures ou égales à 1.",
        ));
    }
    if stake <= 0 {
        return Err(ApiError::bad_request("La mise doit être positive."));
    }
    normalize_side(my_side)?;
    Ok(())
}

fn normalize_side(side: &str) -> Result<String, ApiError> {
    match side.trim().to_uppercase().as_str() {
        "A" => Ok("A".to_string()),
        "B" => Ok("B".to_string()),
        _ => Err(ApiError::bad_request("Côté invalide.")),
    }
}

fn unique_user_ids(user_ids: Vec<String>, self_id: &str) -> Vec<String> {
    let mut unique = Vec::new();
    for user_id in user_ids {
        let user_id = user_id.trim().to_string();
        if user_id.is_empty() || user_id == self_id || unique.contains(&user_id) {
            continue;
        }
        unique.push(user_id);
    }
    unique
}

async fn ensure_friend(db: &SqlitePool, user_id: &str, other_id: &str) -> Result<(), ApiError> {
    let exists = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM friendships
        WHERE ((requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?))
          AND status = 'accepted'
        "#,
    )
    .bind(user_id)
    .bind(other_id)
    .bind(other_id)
    .bind(user_id)
    .fetch_one(db)
    .await?;
    if exists == 0 {
        return Err(ApiError::forbidden(
            "Tu peux inviter uniquement des amis à ce pari.",
        ));
    }
    Ok(())
}

async fn ensure_bet_visible(db: &SqlitePool, user_id: &str, bet_id: &str) -> Result<(), ApiError> {
    let visible = sqlx::query_scalar::<_, i64>(
        r#"
        WITH my_friends AS (
            SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS id
            FROM friendships
            WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
        )
        SELECT COUNT(*)
        FROM bets b
        WHERE b.id = ?
          AND (
            EXISTS (SELECT 1 FROM bet_participants WHERE bet_id = b.id AND user_id = ?)
            OR EXISTS (
                SELECT 1 FROM bet_participants
                WHERE bet_id = b.id AND user_id IN (SELECT id FROM my_friends)
            )
          )
        "#,
    )
    .bind(user_id)
    .bind(user_id)
    .bind(user_id)
    .bind(bet_id)
    .bind(user_id)
    .fetch_one(db)
    .await?;
    if visible == 0 {
        return Err(ApiError::not_found("Pari introuvable."));
    }
    Ok(())
}

async fn hydrate_bets(db: &SqlitePool, rows: Vec<BetRow>) -> Result<Vec<BetResponse>, ApiError> {
    let mut bets = Vec::with_capacity(rows.len());
    for row in rows {
        let participants = get_bet_participants(db, &row.id).await?;
        bets.push(BetResponse::from_row(row, participants));
    }
    Ok(bets)
}

async fn get_bet_row(db: &SqlitePool, bet_id: &str) -> Result<BetRow, ApiError> {
    sqlx::query_as::<_, BetRow>(
        r#"
        SELECT b.*, u.username AS initiator_username
        FROM bets b
        JOIN users u ON u.id = b.initiator_id
        WHERE b.id = ?
        LIMIT 1
        "#,
    )
    .bind(bet_id)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| ApiError::not_found("Pari introuvable."))
}

async fn get_bet_response(db: &SqlitePool, bet_id: &str) -> Result<BetResponse, ApiError> {
    let row = get_bet_row(db, bet_id).await?;
    let participants = get_bet_participants(db, bet_id).await?;
    Ok(BetResponse::from_row(row, participants))
}

async fn get_bet_participants(
    db: &SqlitePool,
    bet_id: &str,
) -> Result<Vec<BetParticipant>, ApiError> {
    Ok(sqlx::query_as::<_, BetParticipant>(
        r#"
        SELECT bp.id, bp.user_id, u.username, bp.side, bp.amount, bp.status, bp.created_at
        FROM bet_participants bp
        JOIN users u ON u.id = bp.user_id
        WHERE bp.bet_id = ?
        ORDER BY CASE bp.status WHEN 'accepted' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END,
                 bp.created_at ASC
        "#,
    )
    .bind(bet_id)
    .fetch_all(db)
    .await?)
}

async fn participant_user_ids(db: &SqlitePool, bet_id: &str) -> Result<Vec<String>, ApiError> {
    Ok(
        sqlx::query_scalar::<_, String>("SELECT user_id FROM bet_participants WHERE bet_id = ?")
            .bind(bet_id)
            .fetch_all(db)
            .await?,
    )
}

#[derive(FromRow)]
struct SettlementParticipant {
    user_id: String,
    side: String,
    amount: i64,
}

async fn create_debts_for_result(
    db: &SqlitePool,
    bet: &BetRow,
    winning_side: &str,
) -> Result<(), ApiError> {
    let participants = sqlx::query_as::<_, SettlementParticipant>(
        r#"
        SELECT user_id, side, amount
        FROM bet_participants
        WHERE bet_id = ? AND status = 'accepted' AND side IS NOT NULL AND amount > 0
        "#,
    )
    .bind(&bet.id)
    .fetch_all(db)
    .await?;

    let winners: Vec<_> = participants
        .iter()
        .filter(|participant| participant.side == winning_side)
        .collect();
    let losers: Vec<_> = participants
        .iter()
        .filter(|participant| participant.side != winning_side)
        .collect();

    if winners.is_empty() || losers.is_empty() {
        return Ok(());
    }

    let total_loser_amount: i64 = losers.iter().map(|participant| participant.amount).sum();
    if total_loser_amount <= 0 {
        return Ok(());
    }

    let odds = if winning_side == "A" {
        bet.odds_a
    } else {
        bet.odds_b
    };

    for winner in winners {
        let gross_gain = (winner.amount as f64 * odds).round() as i64;
        let profit = (gross_gain - winner.amount).max(0);
        if profit == 0 {
            continue;
        }

        let mut remaining = profit;
        for (index, loser) in losers.iter().enumerate() {
            let raw_amount = if index == losers.len() - 1 {
                remaining
            } else {
                ((profit as f64) * (loser.amount as f64) / (total_loser_amount as f64)).round()
                    as i64
            };
            let amount = raw_amount.clamp(0, remaining);
            remaining -= amount;

            if amount > 0 {
                sqlx::query(
                    r#"
                    INSERT INTO debts (id, bet_id, debtor_id, creditor_id, amount, status)
                    VALUES (?, ?, ?, ?, ?, 'open')
                    "#,
                )
                .bind(Uuid::new_v4().to_string())
                .bind(&bet.id)
                .bind(&loser.user_id)
                .bind(&winner.user_id)
                .bind(amount)
                .execute(db)
                .await?;
            }
        }
    }

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DebtsResponse {
    i_owe: Vec<DebtResponse>,
    owed_to_me: Vec<DebtResponse>,
}

#[derive(Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
struct DebtResponse {
    id: String,
    bet_id: String,
    bet_title: String,
    debtor_id: String,
    debtor_username: String,
    creditor_id: String,
    creditor_username: String,
    amount: i64,
    status: String,
    created_at: String,
    settled_at: Option<String>,
}

async fn list_debts(State(state): State<AppState>, auth: AuthUser) -> ApiResult<DebtsResponse> {
    Ok(Json(DebtsResponse {
        i_owe: get_debts(&state.db, "debtor", &auth.id).await?,
        owed_to_me: get_debts(&state.db, "creditor", &auth.id).await?,
    }))
}

async fn get_debts(
    db: &SqlitePool,
    role: &str,
    user_id: &str,
) -> Result<Vec<DebtResponse>, ApiError> {
    let condition = if role == "debtor" {
        "d.debtor_id = ?"
    } else {
        "d.creditor_id = ?"
    };
    let query = format!(
        r#"
        SELECT d.id, d.bet_id, b.title AS bet_title,
               d.debtor_id, debtor.username AS debtor_username,
               d.creditor_id, creditor.username AS creditor_username,
               d.amount, d.status, d.created_at, d.settled_at
        FROM debts d
        JOIN bets b ON b.id = d.bet_id
        JOIN users debtor ON debtor.id = d.debtor_id
        JOIN users creditor ON creditor.id = d.creditor_id
        WHERE {condition}
        ORDER BY CASE d.status WHEN 'open' THEN 0 ELSE 1 END, d.created_at DESC
        "#
    );

    Ok(sqlx::query_as::<_, DebtResponse>(&query)
        .bind(user_id)
        .fetch_all(db)
        .await?)
}

async fn settle_debt(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(debt_id): Path<String>,
) -> ApiResult<DebtResponse> {
    let debt = sqlx::query_as::<_, DebtResponse>(
        r#"
        SELECT d.id, d.bet_id, b.title AS bet_title,
               d.debtor_id, debtor.username AS debtor_username,
               d.creditor_id, creditor.username AS creditor_username,
               d.amount, d.status, d.created_at, d.settled_at
        FROM debts d
        JOIN bets b ON b.id = d.bet_id
        JOIN users debtor ON debtor.id = d.debtor_id
        JOIN users creditor ON creditor.id = d.creditor_id
        WHERE d.id = ?
        LIMIT 1
        "#,
    )
    .bind(&debt_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| ApiError::not_found("Dette introuvable."))?;

    if debt.debtor_id != auth.id && debt.creditor_id != auth.id {
        return Err(ApiError::forbidden("Dette non modifiable."));
    }

    sqlx::query(
        r#"
        UPDATE debts
        SET status = 'settled', settled_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&debt_id)
    .execute(&state.db)
    .await?;

    let updated = sqlx::query_as::<_, DebtResponse>(
        r#"
        SELECT d.id, d.bet_id, b.title AS bet_title,
               d.debtor_id, debtor.username AS debtor_username,
               d.creditor_id, creditor.username AS creditor_username,
               d.amount, d.status, d.created_at, d.settled_at
        FROM debts d
        JOIN bets b ON b.id = d.bet_id
        JOIN users debtor ON debtor.id = d.debtor_id
        JOIN users creditor ON creditor.id = d.creditor_id
        WHERE d.id = ?
        LIMIT 1
        "#,
    )
    .bind(&debt_id)
    .fetch_one(&state.db)
    .await?;

    let actor = get_user_public(&state.db, &auth.id).await?;
    let other_id = if updated.debtor_id == auth.id {
        updated.creditor_id.clone()
    } else {
        updated.debtor_id.clone()
    };
    emit_event(
        &state,
        vec![other_id],
        "debt_settled",
        format!("{} a marqué une dette comme réglée.", actor.username),
        Some(actor),
        Some(updated.bet_id.clone()),
        None,
        Some(updated.id.clone()),
    );

    Ok(Json(updated))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WsQuery {
    token: String,
}

async fn websocket_handler(
    State(state): State<AppState>,
    Query(query): Query<WsQuery>,
    ws: WebSocketUpgrade,
) -> Result<Response, ApiError> {
    let user_id = verify_token(&query.token, state.jwt_secret.as_str())?;
    Ok(ws.on_upgrade(move |socket| websocket(socket, state, user_id)))
}

async fn websocket(mut socket: WebSocket, state: AppState, user_id: String) {
    let mut rx = state.events.subscribe();
    let connected = RealtimeEvent {
        kind: "connected".to_string(),
        message: "Temps réel connecté.".to_string(),
        bet_id: None,
        friendship_id: None,
        debt_id: None,
        actor: None,
        created_at: Utc::now().to_rfc3339(),
    };
    if let Ok(payload) = serde_json::to_string(&connected) {
        let _ = socket.send(Message::Text(payload)).await;
    }

    while let Ok(envelope) = rx.recv().await {
        if !envelope.recipients.is_empty() && !envelope.recipients.contains(&user_id) {
            continue;
        }
        let payload = match serde_json::to_string(&envelope.event) {
            Ok(payload) => payload,
            Err(error) => {
                tracing::error!(?error, "websocket serialization error");
                continue;
            }
        };
        if socket.send(Message::Text(payload)).await.is_err() {
            break;
        }
    }
}
