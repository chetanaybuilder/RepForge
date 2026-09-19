"""
All queries against the users table. Every statement is parameterized;
nothing here ever string-formats user input into SQL.
"""

from backend.database.db import fetch_one, execute_returning


def get_user_by_google_id(google_id: str):
    return fetch_one(
        "SELECT id, google_id, email, name, avatar_url, created_at, updated_at "
        "FROM users WHERE google_id = %s",
        (google_id,),
    )


def get_user_by_id(user_id: str):
    return fetch_one(
        "SELECT id, google_id, email, name, avatar_url, created_at, updated_at "
        "FROM users WHERE id = %s",
        (user_id,),
    )


def get_user_by_email(email: str):
    return fetch_one(
        "SELECT id, google_id, email, name, avatar_url, created_at, updated_at "
        "FROM users WHERE lower(email) = lower(%s)",
        (email,),
    )


def create_user(google_id: str, email: str, name: str, avatar_url: str):
    return execute_returning(
        """
        INSERT INTO users (google_id, email, name, avatar_url)
        VALUES (%s, %s, %s, %s)
        RETURNING id, google_id, email, name, avatar_url, created_at, updated_at
        """,
        (google_id, email, name, avatar_url),
    )


def update_user_profile(user_id: str, name: str, avatar_url: str):
    return execute_returning(
        """
        UPDATE users SET name = %s, avatar_url = %s
        WHERE id = %s
        RETURNING id, google_id, email, name, avatar_url, created_at, updated_at
        """,
        (name, avatar_url, user_id),
    )


def find_or_create_user_from_google(google_id: str, email: str, name: str, avatar_url: str):
    """
    Core of the OAuth callback: look the user up by their stable Google
    subject id (never by email alone, which can change or be reused), and
    create them if this is the first time we've seen them. Returns the
    internal application user row — this is what every subsequent request
    is authorized against, never the raw Google id or email.
    """
    existing = get_user_by_google_id(google_id)
    if existing:
        # Keep profile info fresh (name/avatar can change on Google's side).
        if existing["name"] != name or existing["avatar_url"] != avatar_url:
            return update_user_profile(existing["id"], name, avatar_url)
        return existing
    return create_user(google_id, email, name, avatar_url)
