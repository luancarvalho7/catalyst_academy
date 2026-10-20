/* Catalog shown on /home. Only Foundations has content today; its lessons live at "/" (?lesson=n deep-links). */

export type CourseStatus = "new" | "soon";

export type Course = {
  id: number;
  title: string[];
  lessons: number;
  minutes: number;
  status: CourseStatus;
  image: string;
  /** Face centre in `image` as a CSS position; keeps round avatars and narrow tiles on the face. */
  focus: string;
  /** Route for courses that are open; undefined means the course has no content yet. */
  href?: string;
  /** Teased only: art and title render blurred and the name is never announced. */
  concealed?: boolean;
  summary: string;
};

export const COURSES: Course[] = [
  {
    id: 1,
    title: ["Foundations"],
    lessons: 5,
    minutes: 35,
    status: "new",
    image: "/courses/foundations.jpg",
    focus: "54% 40%",
    href: "/",
    summary: "How prediction markets work, sizing your risk, getting filled and knowing when to exit.",
  },
  {
    id: 2,
    title: ["Finding", "Your Edge"],
    lessons: 6,
    minutes: 40,
    status: "soon",
    image: "/courses/finding-your-edge.jpg",
    focus: "46% 37%",
    summary: "Estimate probabilities better than the crowd, and measure whether you actually are.",
  },
  {
    id: 3,
    title: ["Trading", "Strategies"],
    lessons: 6,
    minutes: 40,
    status: "soon",
    image: "/courses/trading-strategies.jpg",
    focus: "54% 40%",
    summary: "Repeatable playbooks for live sports, news-driven markets and arbitrage.",
  },
  {
    id: 4,
    title: ["Quantitative", "& Systematic Trading"],
    lessons: 6,
    minutes: 45,
    status: "soon",
    image: "/courses/quantitative-trading.jpg",
    focus: "48% 45%",
    concealed: true,
    summary: "Models, signals and automated execution for prediction markets.",
  },
];

export const TOTAL_LESSONS = COURSES.reduce((sum, course) => sum + course.lessons, 0);

/* Foundations lessons, mirrored from AcademyExperience so the quiz can deep-link into them. */
export const FOUNDATIONS_LESSONS = [
  { number: 1, title: "Introduction to Catalyst Academy" },
  { number: 2, title: "How Prediction Markets Work" },
  { number: 3, title: "How Much Should You Risk?" },
  { number: 4, title: "How Do You Actually Get Filled?" },
  { number: 5, title: "When Do You Get Out?" },
] as const;
