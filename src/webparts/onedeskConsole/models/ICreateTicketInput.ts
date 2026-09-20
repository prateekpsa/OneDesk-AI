/** Phase 6 (build_plan.md) - the employee self-service "Raise a ticket" form's inputs. */
export interface ICreateTicketInput {
  department: string;
  category: string;
  priority: string;
  description: string;
  requesterEmail: string;
  requesterName: string;
}
