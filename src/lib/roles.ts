/** What each invitable workspace role can do. Shared by the server page and the invite form. */
export const ROLE_HELP = {
  admin: "Everything, including team and show settings.",
  editor: "Add and edit shows and episodes, and publish.",
  viewer: "See shows and analytics. Can't change anything.",
} as const;

export type InvitableRole = keyof typeof ROLE_HELP;
