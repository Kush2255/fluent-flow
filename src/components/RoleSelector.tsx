import { motion } from "framer-motion";
import { Code, Database, Briefcase, ChevronRight } from "lucide-react";

interface RoleSelectorProps {
  onSelect: (role: string) => void;
}

const roles = [
  {
    id: "software_engineer",
    title: "Software Engineer",
    description: "DSA, coding, system design, debugging",
    icon: Code,
    questions: 12,
  },
  {
    id: "data_analyst",
    title: "Data Analyst",
    description: "SQL, data interpretation, visualization",
    icon: Database,
    questions: 10,
  },
  {
    id: "product_manager",
    title: "Product Manager",
    description: "Product thinking, metrics, prioritization",
    icon: Briefcase,
    questions: 10,
  },
];

const RoleSelector = ({ onSelect }: RoleSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Choose Your Role</h3>
        <p className="text-sm text-muted-foreground">Select the role you're preparing for</p>
      </div>
      <div className="grid gap-3">
        {roles.map((role, i) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(role.id)}
            className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <role.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{role.title}</p>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
              <span className="text-xs">{role.questions} questions</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelector;
