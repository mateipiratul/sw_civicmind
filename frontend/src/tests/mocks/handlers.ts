import { http, HttpResponse } from "msw";
import { db } from "./db";

export const handlers = [
  // GET current profile
  http.get("http://localhost:4001/api/profiles/me/", () => {
    const user = db.getUser();
    return HttpResponse.json(user);
  }),

  // PATCH update profile
  http.patch("http://localhost:4001/api/profiles/me/", async ({ request }) => {
    try {
      const body = (await request.json()) as any;
      const updatedUser = db.updateUser(body);
      return HttpResponse.json(updatedUser);
    } catch (error) {
      return HttpResponse.json({ error: "Failed to update profile" }, { status: 400 });
    }
  }),

  // PUT update profile
  http.put("http://localhost:4001/api/profiles/me/", async ({ request }) => {
    try {
      const body = (await request.json()) as any;
      const updatedUser = db.updateUser(body);
      return HttpResponse.json(updatedUser);
    } catch (error) {
      return HttpResponse.json({ error: "Failed to update profile" }, { status: 400 });
    }
  }),

  // GET questionnaire metadata
  http.get("http://localhost:4001/api/profiles/questionnaire/", () => {
    return HttpResponse.json({
      impact_categories: ["Justiție", "Sănătate", "Educație"],
      counties: ["București", "Cluj", "Timiș"],
      affected_profiles: ["Student", "Pensionar", "Angajat"]
    });
  }),
];
