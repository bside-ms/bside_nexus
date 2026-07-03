'use client';

import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type VacationDetails = {
  annualEntitlement: number;
  carryOver: number;
  taken: {
    total: number;
    fromCarryOver: number;
    fromAnnual: number;
  };
  planned: number;
  available: number;
  isCarryOverExpired: boolean;
};

type VacationOverviewProps = {
  showDatePicker?: boolean;
  initialDate?: Date;
};

export default function VacationOverview({
  showDatePicker = true,
  initialDate,
}: VacationOverviewProps): ReactElement {
  const [date, setDate] = useState<Date>(initialDate || new Date());
  const [details, setDetails] = useState<VacationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const dateString = format(date, 'yyyy-MM-dd');
        const res = await fetch(
          `/api/hrp/vacation-overview?date=${dateString}`,
        );
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        } else {
          setDetails(null);
        }
      } catch (error) {
        console.error('Failed to fetch vacation details', error);
        setDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [date]);

  const year = date.getFullYear();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <CardTitle className="text-sm font-semibold">Urlaubskonto {year}</CardTitle>
        {showDatePicker && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-[180px] h-8 justify-start text-left font-normal text-xs',
                  !date && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                  format(date, 'PPP', { locale: de })
                ) : (
                  <span>Wähle ein Datum</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !details ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Fehler beim Laden der Urlaubsdaten.
          </p>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
              <span>Jahresanspruch:</span>
              <span className="font-medium text-foreground">
                {details.annualEntitlement} Tage
              </span>
            </div>

            {!details.isCarryOverExpired && (
              <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                <span>Resturlaub {year - 1}:</span>
                <span className="font-medium text-foreground">
                  {details.carryOver} Tage
                </span>
              </div>
            )}

            <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
              <span>Davon genommen:</span>
              <span className="font-medium text-foreground">
                {details.isCarryOverExpired
                  ? details.taken.fromAnnual
                  : details.taken.total}{' '}
                Tage
              </span>
            </div>

            <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
              <span>Davon geplant:</span>
              <span className="font-medium text-foreground">
                {details.planned} Tage
              </span>
            </div>

            <div className="flex justify-between pt-0.5 font-bold">
              <span>Verfügbar gesamt:</span>
              <span>{details.available} Tage</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
