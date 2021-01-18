import { dynGet } from '../targets/dynamo'
import Bill from '../types/Bill'

export async function CalculateMonth(_: any, args: any) {
  const bills: any = {
    billTypes: {},
    total: 0,
  }
  if (typeof args.billTypes === 'undefined') {
    args.billTypes = [
      'electric',
      'gas',
      'water',
      'internet',
      'trash',
      'home_insurance',
    ]
  }
  const billTypeProms = []
  for (const type of args.billTypes) {
    const billParam = {
      ...args,
      billType: type,
    }
    billTypeProms.push(dynGet(Bill, billParam))
  }
  const results = await Promise.all(billTypeProms)
  for (const result of results) {
    if (typeof result.total === 'undefined') {
      continue
    }
    bills.billTypes[result.billType] = result.total
    bills.total += result.total
    bills.month = result.month
  }
  if (typeof bills.month === 'undefined') {
    return null
  }
  return bills
}

export async function CalculateYear(_: any, args: any) {
  const bills: any = {
    billTypes: {},
    total: 0,
  }
  if (typeof args.months === 'undefined') {
    args.months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
  }
  const res: any = {
    months: [],
    total: 0,
  }
  const resultPromises = []
  for (const month of args.months) {
    resultPromises.push(
      CalculateMonth(
        {},
        {
          month,
          year: args.year,
          billTypes: args.billTypes,
        }
      )
    )
  }
  const results = await Promise.all(resultPromises)
  for (const result of results) {
    if (result === null) {
      continue
    }
    res.total += result.total
    res.months.push(result)
  }
  return res
}
