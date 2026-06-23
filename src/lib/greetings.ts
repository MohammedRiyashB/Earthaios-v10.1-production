export const getGreeting = () => {
  const baseGreetings = [
    "How can I help you today", "What's on your mind", "Ready to build something amazing",
    "How can I assist you", "Let's create something brilliant", "What are we working on today",
    "How can I make your day better", "What shall we explore today", "Ready for your next big idea",
    "How may I serve you", "What's the plan for today", "How can I help you achieve your goals",
    "Let's dive into something new", "What challenge are we tackling today", "Your next command",
    "How can I support your work", "Ready when you are", "What can I do for you today",
    "Let's make some progress", "What's our next project", "Good to see you", "Hello there",
    "Welcome back", "Greetings", "How have you been", "What's new", "How are things",
    "Hope you're doing well", "Let's get started", "Ready to innovate", "What's the objective today",
    "System online, waiting for input", "Awaiting instructions", "How can I be of service",
    "Let's discover something together", "What's the next step", "How can I streamline your day",
    "Let's tackle your tasks", "Time to create", "Shall we begin", "Here to help",
    "At your service", "Ready for action", "Let's brainstorm", "Got a question",
    "Need some ideas", "Let's find the solution", "I'm listening", "Tell me what you need",
    "I'm ready to assist", "Let's optimize things", "Awaiting your command", "How can I elevate your workflow",
    "Ready to assist", "Let's jump in", "What task is next", "Let's crush those goals",
    "Here's to a productive day", "Let's build the future", "I'm here to help", "What can we discover today",
    "Any big plans for today", "Ready to problem-solve", "Ask me anything", "Let's get to work",
    "How can I make this easier", "Let's find the answers", "Let's innovate together", "What's the challenge",
    "How can I be of assistance", "Need any guidance", "What's the priority", "Let's focus on what matters",
    "Ready to analyze", "Let's get things done", "How can I empower you", "Let's unlock your potential",
    "What's your vision", "Let's shape the future", "How can I simplify this", "Let's design something great",
    "Ready for the next challenge", "What are we building today", "Let's turn ideas into reality",
    "I'm standing by", "Let's create magic", "What's on the agenda", "How can I enhance your project",
    "Let's push the boundaries", "Ready to collaborate", "Let's achieve greatness", "I'm here for you",
    "What's the objective", "Let's make it happen", "Welcome to Earth OS", "How can we improve today",
    "Let's start your journey", "Ready for the next level", "What's the objective",
    "Connecting you to the future"
  ];

  const chosenGreeting = baseGreetings[Math.floor(Math.random() * baseGreetings.length)];
  
  return `${chosenGreeting}?`;
};
