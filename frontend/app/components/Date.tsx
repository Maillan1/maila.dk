import {format} from 'date-fns'
import {da} from 'date-fns/locale'

export default function DateComponent({dateString}: {dateString: string | undefined}) {
  if (!dateString) {
    return null
  }

  return (
    <time dateTime={dateString} className="">
      {format(new Date(dateString), 'd. MMMM yyyy', {locale: da})}
    </time>
  )
}
