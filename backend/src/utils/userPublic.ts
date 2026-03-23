export function toPublicUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  isAdmin: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isOnline: user.isOnline,
    isAdmin: user.isAdmin,
  };
}
