import express from "express";
import CookieService from "@/services/Cookie";
import TokenIntrospection from "@/types/TokenIntrospection";
import JwtUtil from "@/utils/Jwt";

const router: express.Router = express.Router();

router.use("/", async (req, res) => {
  try {
    if (!req.cookies.session) throw new Error("Request is missing a session cookie.");

    const isExpired = await CookieService.validateCookieExpiration(req.cookies.session);

    if (isExpired) {
      if (!req.headers["x-forwarded-uri"]) throw new Error("Request is missing a x-forwarded-uri header.");

      const sessionCookie = await CookieService.renewSessionCookie(req.cookies.session);

      res.cookie("session", sessionCookie.value, sessionCookie.options);
      res.setHeader("Location", req.headers["x-forwarded-uri"]);
      res.status(307).send();
    }

    if (!isExpired) {
      const inspectedToken: TokenIntrospection = await CookieService.validateSessionCookie(
        req.cookies.session
      );

      const realmName = JwtUtil.getTokenIssuerRealm(inspectedToken);
      res.setHeader("X-Auth-Realm", realmName);

      const user = inspectedToken.email ?? inspectedToken.username ?? "";
      res.setHeader("X-Forwarded-User", user);
      res.status(200).send();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    res.status(401).send(e.message);
    return;
  }
});

export default router;
