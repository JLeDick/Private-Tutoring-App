import {
  AssessmentType,
  QuestionType,
  Role,
} from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

/** Internal unique keys only — login is role buttons, not email/password. */
const studentEmail = process.env.SEED_STUDENT_EMAIL ?? "niece@local";
const tutorEmail = process.env.SEED_TUTOR_EMAIL ?? "tutor@local";
const unusedPasswordHash = () => hashPassword("not-used-login-is-by-name-only");

function mc(prompt: string, choices: string[], correctIndex: number, points = 1) {
  return {
    type: QuestionType.MULTIPLE_CHOICE,
    prompt,
    choicesJson: JSON.stringify(choices),
    correctIndex,
    points,
  };
}

function sa(prompt: string, points = 2) {
  return {
    type: QuestionType.SHORT_ANSWER,
    prompt,
    choicesJson: null,
    correctIndex: null,
    points,
  };
}

async function main() {
  await prisma.integrityEvent.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.coreIdea.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      email: tutorEmail,
      displayName: "Tutor",
      passwordHash: await unusedPasswordHash(),
      role: Role.TUTOR,
    },
  });
  await prisma.user.create({
    data: {
      email: studentEmail,
      displayName: "Niece",
      passwordHash: await unusedPasswordHash(),
      role: Role.STUDENT,
    },
  });

  const coursesData = [
    {
      slug: "foundational-math",
      title: "Foundational Math",
      sortOrder: 0,
      ideas: [
        {
          slug: "number-sense",
          title: "Number sense",
          description: "Whole numbers, place value, rounding.",
        },
        {
          slug: "fractions",
          title: "Fractions",
          description: "Meaning of fractions, equivalence, basics.",
        },
      ],
    },
    {
      slug: "pre-algebra",
      title: "Pre-Algebra",
      sortOrder: 1,
      ideas: [
        {
          slug: "expressions",
          title: "Expressions",
          description: "Variables, combining like terms.",
        },
        {
          slug: "ratios",
          title: "Ratios & proportions",
          description: "Ratio language and simple proportions.",
        },
      ],
    },
    {
      slug: "geometry",
      title: "Geometry",
      sortOrder: 2,
      ideas: [
        {
          slug: "angles-and-lines",
          title: "Angles & lines",
          description: "Parallel lines, angle relationships.",
        },
        {
          slug: "area-basics",
          title: "Area basics",
          description: "Rectangles, triangles, composite shapes.",
        },
      ],
    },
    {
      slug: "algebra-1",
      title: "Algebra 1",
      sortOrder: 3,
      ideas: [
        {
          slug: "linear-equations",
          title: "Linear equations",
          description: "Solve one-variable linear equations.",
        },
        {
          slug: "graphing-basics",
          title: "Graphing basics",
          description: "Plot points, interpret slope as rate of change.",
        },
      ],
    },
  ] as const;

  for (const c of coursesData) {
    const course = await prisma.course.create({
      data: {
        slug: c.slug,
        title: c.title,
        sortOrder: c.sortOrder,
        coreIdeas: {
          create: c.ideas.map((idea, idx) => ({
            slug: idea.slug,
            title: idea.title,
            description: idea.description,
            sortOrder: idx,
          })),
        },
      },
      include: { coreIdeas: true },
    });

    await prisma.assessment.create({
      data: {
        type: AssessmentType.UNIT_TEST,
        title: `${course.title} — Unit test`,
        sortOrder: 99,
        progressWeight: 10,
        courseId: course.id,
        questions: {
          create: [
            {
              sortOrder: 0,
              ...mc("Which value is equivalent to 1/2?", ["0.25", "0.5", "0.2", "0.05"], 1, 2),
            },
            {
              sortOrder: 1,
              ...sa("Explain in one sentence how you would check if x = 3 solves an equation.", 3),
            },
          ],
        },
      },
    });

    for (const idea of course.coreIdeas) {
      await prisma.assessment.create({
        data: {
          type: AssessmentType.ASSIGNMENT,
          title: `${idea.title} — Assignment`,
          sortOrder: 0,
          progressWeight: 2,
          coreIdeaId: idea.id,
          questions: {
            create: [
              {
                sortOrder: 0,
                ...mc(
                  "Sample check: 12 ÷ 3 equals what?",
                  ["3", "4", "6", "9"],
                  1,
                  1,
                ),
              },
              {
                sortOrder: 1,
                ...sa("Write one short sentence about the main idea of this topic.", 2),
              },
            ],
          },
        },
      });

      await prisma.assessment.create({
        data: {
          type: AssessmentType.QUIZ,
          title: `${idea.title} — Quiz`,
          sortOrder: 1,
          progressWeight: 3,
          coreIdeaId: idea.id,
          questions: {
            create: [
              {
                sortOrder: 0,
                ...mc("Which number is greater: −2 or −5?", ["−5", "−2", "They are equal", "Cannot tell"], 1, 1),
              },
              {
                sortOrder: 1,
                ...mc("Which expression simplifies to 2x + 1?", ["x + x + 1", "2(x + 1)", "x + 2", "2x + 2"], 0, 1),
              },
              {
                sortOrder: 2,
                ...sa("Show one step of work for a simple problem you choose from this topic.", 2),
              },
            ],
          },
        },
      });
    }
  }

  await prisma.assessment.create({
    data: {
      type: AssessmentType.PLACEMENT,
      title: "GED Math — Placement",
      sortOrder: 0,
      progressWeight: 0,
      questions: {
        create: [
          {
            sortOrder: 0,
            ...mc("Compute: 15 + 27", ["40", "41", "42", "43"], 2, 1),
          },
          {
            sortOrder: 1,
            ...mc("Which fraction is largest?", ["1/3", "1/4", "2/5", "1/6"], 2, 1),
          },
          {
            sortOrder: 2,
            ...mc("Solve: 2x = 10", ["x = 5", "x = 8", "x = 12", "x = 20"], 0, 1),
          },
          {
            sortOrder: 3,
            ...mc("A rectangle has length 4 and width 3. What is its area?", ["7", "12", "14", "24"], 1, 1),
          },
          {
            sortOrder: 4,
            ...mc("What is the slope of the line through (0,0) and (2,4)?", ["1/2", "2", "4", "8"], 1, 1),
          },
        ],
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete. Open /login and choose Niece or Tutor.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
