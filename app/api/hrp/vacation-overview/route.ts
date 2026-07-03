import { type NextRequest, NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getVacationAccountDetails } from '@/lib/hrp/vacation';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getUserSession();
  if (!session?.id || !session.roles?.includes('arbeitszeiterfassung')) {
    return NextResponse.json(
      { message: 'You are not authorized to perform this action.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');

  if (!dateParam) {
    return NextResponse.json(
      { message: 'Date parameter is required.' },
      { status: 400 },
    );
  }

  const targetDate = new Date(dateParam);
  if (isNaN(targetDate.getTime())) {
    return NextResponse.json(
      { message: 'Invalid date format.' },
      { status: 400 },
    );
  }

  try {
    const vacationDetails = await getVacationAccountDetails(
      session.id,
      targetDate,
    );
    return NextResponse.json(vacationDetails);
  } catch (error) {
    console.error('Failed to get vacation account details:', error);
    return NextResponse.json(
      { message: 'An internal error occurred.' },
      { status: 500 },
    );
  }
}
