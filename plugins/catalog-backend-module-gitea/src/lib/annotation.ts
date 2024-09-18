/**
 * The value of this annotation is the so-called login that identifies a user on
 * [GitHub](https://github.com) (either the public one, or a private GitHub
 * Enterprise installation) that is related to this entity. It is on the format
 * `<username>`, and is the same as can be seen in the URL location bar of the
 * browser when viewing that user.
 *
 * @public
 */
export const ANNOTATION_GITHUB_USER_LOGIN = 'github.com/user-login';

/**
 * The value of this annotation is the so-called slug that identifies a team on
 * [GitHub](https://github.com) (either the public one, or a private GitHub
 * Enterprise installation) that is related to this entity. It is on the format
 * `<organization>/<team>`, and is the same as can be seen in the URL location
 * bar of the browser when viewing that team.
 *
 * @public
 */
export const ANNOTATION_GITHUB_TEAM_SLUG = 'github.com/team-slug';