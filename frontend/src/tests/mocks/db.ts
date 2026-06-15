export interface MockUser {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  balance: number;
  totalWinnings: number;
  createdAt: string;
  county: string | null;
  preferred_party: string | null;
  interests: string[];
  persona_tags: string[];
  work_domain: string | null;
  employment_status: string | null;
  personal_interest_areas: string[];
  avatar_url?: string;
  questionnaire_completed?: boolean;
}

const initialUser: MockUser = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  role: "user",
  status: "active",
  balance: 1000,
  totalWinnings: 500,
  createdAt: new Date().toISOString(),
  county: null,
  preferred_party: null,
  interests: [],
  persona_tags: [],
  work_domain: null,
  employment_status: null,
  personal_interest_areas: [],
  avatar_url: "",
  questionnaire_completed: false,
};

class MockDatabase {
  private user: MockUser = { ...initialUser };

  getUser() {
    return this.user;
  }

  updateUser(data: Partial<MockUser>) {
    this.user = { ...this.user, ...data };
    
    // Simulate derived tags & interests based on user questionnaire inputs (similar to backend)
    const interests = new Set<string>(this.user.interests);
    const personaTags = new Set<string>(this.user.persona_tags);

    if (this.user.work_domain === "it") {
      interests.add("it");
      interests.add("fiscal");
      interests.add("administratie");
      personaTags.add("it");
    }
    if (this.user.employment_status === "freelancer_pfa") {
      personaTags.add("pfa");
    }
    if (this.user.personal_interest_areas?.includes("digitalization") || this.user.personal_interest_areas?.includes("taxes")) {
      interests.add("it");
      interests.add("fiscal");
    }
    if (this.user.personal_interest_areas?.includes("health")) {
      interests.add("sanatate");
    }
    if (this.user.personal_interest_areas?.includes("education")) {
      interests.add("educatie");
    }
    if (this.user.personal_interest_areas?.includes("justice")) {
      interests.add("justitie");
    }

    this.user.interests = Array.from(interests);
    this.user.persona_tags = Array.from(personaTags);
    this.user.questionnaire_completed = true;

    return this.user;
  }

  reset() {
    this.user = { ...initialUser };
  }
}

export const db = new MockDatabase();
