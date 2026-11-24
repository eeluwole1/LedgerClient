import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { TransactionList } from './components/transaction-list/transaction-list';
import { TransactionForm } from './components/transaction-form/transaction-form';
import { Budgets } from './components/budgets/budgets';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { ResetPassword } from './components/reset-password/reset-password';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    {
        path: 'login',
        component: Login
    },
    {
        path: 'signup',
        component: Signup
    },
    {
        path: 'forgot-password',
        component: ForgotPassword
    },
    {
        path: 'reset-password',
        component: ResetPassword
    },
    {
        path: 'transactions',
        component: TransactionList,
        canActivate: [authGuard]
    },
    {
        path: 'budgets',
        component: Budgets,
        canActivate: [authGuard]
    },
    {
        path: 'add',
        component: TransactionForm,
        canActivate: [authGuard]
    },
    {
        path: 'edit/:id',
        component: TransactionForm,
        canActivate: [authGuard]
    },
        {
        path: '',
        redirectTo: '/transactions',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: '/transactions'
    }

];
