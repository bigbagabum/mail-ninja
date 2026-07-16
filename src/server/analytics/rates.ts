function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export function calculateRates(input: {
  sent: number;
  delivered: number;
  uniqueOpened: number;
  uniqueClicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
}) {
  return {
    deliveryRate: rate(input.delivered, input.sent),
    uniqueOpenRate: rate(input.uniqueOpened, input.delivered),
    uniqueClickRate: rate(input.uniqueClicked, input.delivered),
    clickToOpenRate: rate(input.uniqueClicked, input.uniqueOpened),
    bounceRate: rate(input.bounced, input.sent),
    complaintRate: rate(input.complained, input.delivered),
    unsubscribeRate: rate(input.unsubscribed, input.delivered)
  };
}
