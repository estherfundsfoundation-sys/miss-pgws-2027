import assert from "node:assert/strict";
import test from "node:test";
import { aggregateVerifiedVotes, parseVoteSubmission } from "../lib/voting-sync-core.ts";
import { desiredJotformVotingStatus } from "../lib/voting-window.ts";

function paidSubmission(id, paymentStatus, products, total, transactionId = `pi_${id}_verified`) {
  return {
    id,
    status: "ACTIVE",
    answers: {
      10: {
        type: "control_stripe",
        text: "Vote for Miss Pretty Girls Who Serve 2027",
        answer: { paymentStatus, stripeTransactionId: transactionId, total, products },
      },
    },
  };
}

test("counts only successful Stripe-backed $2.50 votes", () => {
  const parsed = parseVoteSubmission(paidSubmission("1001", "SUCCESSFUL", [
    { name: "Contestant 004 - Gemima Dernier", quantity: 2, price: "2.50" },
    { name: "Contestant 141 - Elissa Ganaway", quantity: 1, price: "2.50" },
  ], "7.50"));
  assert.equal(parsed.eligible, true);
  assert.equal(parsed.votesByContestantNumber.get(4), 2);
  assert.equal(parsed.votesByContestantNumber.get(141), 1);
  assert.equal(parsed.totalCents, 750);
});

test("excludes pending, failed, refunded, disputed, and charged-back payments", () => {
  for (const status of ["PENDING", "FAILED", "REFUNDED", "DISPUTED", "CHARGEBACK"]) {
    const parsed = parseVoteSubmission(paidSubmission(status, status, [{ name: "Contestant 001 - Karine Edmond", quantity: 1 }], "2.50"));
    assert.equal(parsed.eligible, false, status);
  }
});

test("requires a Stripe transaction ID and exact payment amount", () => {
  const noTransaction = parseVoteSubmission(paidSubmission("1002", "PAID", [{ name: "Contestant 001 - Karine Edmond", quantity: 2 }], "5.00", ""));
  const amountMismatch = parseVoteSubmission(paidSubmission("1003", "PAID", [{ name: "Contestant 001 - Karine Edmond", quantity: 2 }], "2.50"));
  const missingTotal = parseVoteSubmission(paidSubmission("1003b", "PAID", [{ name: "Contestant 001 - Karine Edmond", quantity: 2 }], null));
  assert.equal(noTransaction.reason, "missing-transaction-id");
  assert.equal(amountMismatch.reason, "amount-mismatch");
  assert.equal(missingTotal.reason, "missing-payment-total");
});

test("reconciliation is deterministic and reports unresolved paid submissions", () => {
  const result = aggregateVerifiedVotes([
    paidSubmission("1004", "SUCCESSFUL", [{ name: "Contestant 142 - Harminy Gadson", quantity: 4 }], "10.00"),
    paidSubmission("1005", "PENDING", [{ name: "Contestant 142 - Harminy Gadson", quantity: 10 }], "25.00"),
    paidSubmission("1006", "SUCCESSFUL", [{ name: "Unknown product", quantity: 1 }], "2.50"),
  ]);
  assert.equal(result.verifiedSubmissions, 1);
  assert.equal(result.ignoredSubmissions, 1);
  assert.equal(result.unresolvedSubmissions, 1);
  assert.equal(result.votesByContestantNumber.get(142), 4);
  assert.deepEqual(result.unresolvedSubmissionIds, ["1006"]);
});

test("counts a Stripe transaction only once", () => {
  const first = paidSubmission("1007", "SUCCESSFUL", [{ name: "Contestant 010 - Example", quantity: 3 }], "7.50", "pi_same_transaction");
  const duplicate = paidSubmission("1008", "SUCCESSFUL", [{ name: "Contestant 010 - Example", quantity: 3 }], "7.50", "pi_same_transaction");
  const result = aggregateVerifiedVotes([first, duplicate]);
  assert.equal(result.verifiedSubmissions, 1);
  assert.equal(result.duplicateTransactions, 1);
  assert.equal(result.votesByContestantNumber.get(10), 3);
});

test("keeps the ballot closed outside the official voting window", () => {
  assert.equal(desiredJotformVotingStatus(new Date("2026-08-27T15:59:59.999Z")), "Disabled");
  assert.equal(desiredJotformVotingStatus(new Date("2026-08-27T16:00:00.000Z")), "Enabled");
  assert.equal(desiredJotformVotingStatus(new Date("2026-09-04T03:59:59.999Z")), "Enabled");
  assert.equal(desiredJotformVotingStatus(new Date("2026-09-04T04:00:00.000Z")), "Disabled");
});
