'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertIcon,
  AlertContent,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Loader2,
  ChevronRight,
  Circle,
  X,
  AlertTriangle,
  Check,
  Info,
  Minus,
} from 'lucide-react';

import {
  type ComponentShowcaseItem,
  type ComponentState,
  createStateId,
  getStateClassNames,
} from '@/lib/utils/showcase';

interface ComponentShowcaseProps {
  item: ComponentShowcaseItem;
}

export function ComponentShowcase({ item }: ComponentShowcaseProps) {
  const [selectedStateIndex, setSelectedStateIndex] = useState(0);
  const currentState = item.states[selectedStateIndex];

  const renderComponent = () => {
    return (
      <div className="p-6 terminal-panel">
        {renderTransformedComponent(currentState)}
      </div>
    );
  };

  const renderTransformedComponent = (state: ComponentState) => {
    const stateClasses = getStateClassNames(state);

    switch (item.id) {
      case 'wizard-welcome':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-4 terminal-panel p-6">
              <h2 className="text-3xl sm:text-4xl mt-6 font-bold font-mono uppercase amber-glow subtle-scanlines">
                Welcome to Recap AI
              </h2>
              <p className="font-mono max-w-md mx-auto">
                Let's set up your integrations to get started with AI-powered
                activity summaries
              </p>
              <div className="rounded-lg p-4 space-y-2 terminal-border pixel-surface text-left">
                <h3 className="font-semibold font-mono uppercase amber-glow">
                  You'll need:
                </h3>
                <ul className="text-sm text-foreground space-y-2 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-retro-amber-600/40">
                      <ChevronRight className="w-3 h-3 text-accent" />
                    </span>
                    <span>GitHub Personal Access Token</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-retro-amber-600/40">
                      <ChevronRight className="w-3 h-3 text-accent" />
                    </span>
                    <span>Linear API Key</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm border border-retro-amber-600/40">
                      <ChevronRight className="w-3 h-3 text-accent" />
                    </span>
                    <span>OpenAI API Key</span>
                  </li>
                </ul>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="secondary" size="sm" className="font-mono">
                  Back
                </Button>
                <Button variant="default" size="sm" className="font-mono">
                  Continue
                </Button>
              </div>
            </div>
          </div>
        );
      case 'button':
        return (
          <div className="space-y-3">
            <Button
              variant={
                (state.variant as
                  | 'default'
                  | 'destructive'
                  | 'outline'
                  | 'secondary'
                  | 'ghost'
                  | 'link') || 'default'
              }
              size={
                (state.size as 'default' | 'sm' | 'lg' | 'icon') || 'default'
              }
              disabled={state.disabled}
              className={stateClasses.join(' ')}
            >
              {state.loading ? 'Loading...' : 'Action Button'}
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="default" size="sm">
                Primary
              </Button>
              <Button variant="secondary" size="sm">
                Secondary
              </Button>
              <Button variant="outline" size="sm">
                Outline
              </Button>
            </div>
          </div>
        );

      case 'input':
        return (
          <div className="space-y-3">
            <Input
              placeholder="Enter your text..."
              disabled={state.disabled}
              className={stateClasses.join(' ')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input placeholder="Email address" type="email" />
              <Input placeholder="Password" type="password" />
            </div>
          </div>
        );

      case 'card':
        return (
          <Card className={cn(stateClasses.join(' '))}>
            <CardHeader>
              <CardTitle className="amber-glow">Sample Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                This is a sample card with some content to demonstrate the
                styling.
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm">Action</Button>
                <Button size="sm" variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'tabs':
        return (
          <Tabs
            defaultValue="overview"
            className={`w-full ${stateClasses.join(' ')}`}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="features" disabled={currentState.disabled}>
                Features
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <h3 className="font-mono font-bold text-accent">
                &gt; SYSTEM OVERVIEW
              </h3>
              <p className="text-sm text-foreground">
                Terminal interface demonstrating tab navigation with authentic
                retro styling. Features include inset/outset borders, amber glow
                effects, and smooth transitions.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={currentState.disabled}>
                  Initialize
                </Button>
                <Button size="sm" variant="outline">
                  Cancel
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-3">
              <h3 className="font-mono font-bold text-accent">
                &gt; FEATURE SET
              </h3>
              <ul className="text-sm text-foreground space-y-1 font-mono">
                <li className="flex items-center gap-2">
                  <Minus className="w-3 h-3" /> Authentic terminal styling
                </li>
                <li className="flex items-center gap-2">
                  <Minus className="w-3 h-3" /> Smooth state transitions
                </li>
                <li className="flex items-center gap-2">
                  <Minus className="w-3 h-3" /> Amber glow effects
                </li>
                <li className="flex items-center gap-2">
                  <Minus className="w-3 h-3" /> Monospace typography
                </li>
                <li className="flex items-center gap-2">
                  <Minus className="w-3 h-3" /> Retro-futuristic aesthetics
                </li>
              </ul>
            </TabsContent>

            <TabsContent value="settings" className="space-y-3">
              <h3 className="font-mono font-bold text-accent">
                &gt; CONFIGURATION
              </h3>
              <div className="space-y-2">
                <Label className="font-mono text-sm">Terminal Mode</Label>
                <Input
                  placeholder="Enter configuration..."
                  disabled={currentState.disabled}
                  className="font-mono"
                />
              </div>
            </TabsContent>
          </Tabs>
        );

      case 'alert': {
        const alertVariant = state.variant as
          | 'default'
          | 'destructive'
          | 'warning'
          | 'success'
          | undefined;
        const currentVariant = alertVariant || 'default';
        const alertClasses =
          stateClasses.join(' ') +
          (state.disabled ? ' opacity-50 pointer-events-none' : '');

        return (
          <div className="space-y-3">
            <Alert
              variant={currentVariant}
              className={cn(alertClasses, state.loading ? 'pixel-loading' : '')}
            >
              <AlertIcon variant={currentVariant}>
                {state.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : state.active ? (
                  <ChevronRight className="w-4 h-4" />
                ) : state.focused ? (
                  <Circle className="w-4 h-4" />
                ) : state.disabled ? (
                  <X className="w-4 h-4" />
                ) : currentVariant === 'destructive' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : currentVariant === 'warning' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : currentVariant === 'success' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </AlertIcon>
              <AlertContent>
                <AlertTitle variant={currentVariant}>
                  {state.loading
                    ? 'Processing...'
                    : state.active
                      ? 'Active Alert'
                      : state.focused
                        ? 'Focused State'
                        : state.disabled
                          ? 'Disabled Alert'
                          : currentVariant === 'destructive'
                            ? 'Error'
                            : currentVariant === 'warning'
                              ? 'Warning'
                              : currentVariant === 'success'
                                ? 'Success'
                                : 'Information'}
                </AlertTitle>
                <AlertDescription>
                  {state.loading
                    ? 'System is processing your request...'
                    : state.active
                      ? 'This alert is currently active and highlighted.'
                      : state.focused
                        ? 'This alert has keyboard focus and is ready for interaction.'
                        : state.disabled
                          ? 'This alert is disabled and cannot be interacted with.'
                          : currentVariant === 'destructive'
                            ? 'A critical error has occurred in the system.'
                            : currentVariant === 'warning'
                              ? 'Please review the following warning message.'
                              : currentVariant === 'success'
                                ? 'Operation completed successfully.'
                                : 'This is an informational message for the user.'}
                </AlertDescription>
              </AlertContent>
            </Alert>

            {/* Secondary alert to show variant differences */}
            <Alert
              variant={currentVariant === 'default' ? 'warning' : 'default'}
            >
              <AlertIcon
                variant={currentVariant === 'default' ? 'warning' : 'default'}
              >
                {currentVariant === 'default' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </AlertIcon>
              <AlertContent>
                <AlertTitle
                  variant={currentVariant === 'default' ? 'warning' : 'default'}
                >
                  {currentVariant === 'default'
                    ? 'Secondary Alert'
                    : 'Default Alert'}
                </AlertTitle>
                <AlertDescription>
                  {currentVariant === 'default'
                    ? 'Secondary alert showing warning variant styling.'
                    : 'Secondary alert showing default variant styling.'}
                </AlertDescription>
              </AlertContent>
            </Alert>
          </div>
        );
      }

      case 'checkbox':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-mono text-accent">
                Individual Checkboxes
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="checkbox-1"
                    checked={state.active}
                    disabled={state.disabled}
                    className={stateClasses.join(' ')}
                  />
                  <Label htmlFor="checkbox-1" className="font-mono text-sm">
                    {state.loading
                      ? 'Processing option...'
                      : state.active
                        ? 'Selected option'
                        : state.disabled
                          ? 'Disabled option'
                          : 'Terminal checkbox option'}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="checkbox-2"
                    checked={!state.active}
                    disabled={state.disabled}
                  />
                  <Label htmlFor="checkbox-2" className="font-mono text-sm">
                    Alternative terminal option
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="checkbox-3"
                    checked={true}
                    disabled={state.disabled}
                  />
                  <Label htmlFor="checkbox-3" className="font-mono text-sm">
                    Always checked option
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-mono text-accent">
                Terminal Preferences
              </Label>
              <div className="space-y-2 pl-4 border-l-2 border-dashed border-border">
                <div className="flex items-center space-x-2">
                  <Checkbox id="pref-1" checked={state.active} />
                  <Label htmlFor="pref-1" className="font-mono text-sm">
                    Enable amber glow effects
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pref-2" checked={true} />
                  <Label htmlFor="pref-2" className="font-mono text-sm">
                    Show scan lines
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pref-3" />
                  <Label htmlFor="pref-3" className="font-mono text-sm">
                    Retro CRT distortion
                  </Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'radio-group':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-mono text-accent">
                Select Mode
              </Label>
              <RadioGroup
                defaultValue={state.active ? 'b' : 'a'}
                className="pl-4 border-l-2 border-dashed border-border"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="a"
                    id="r-a"
                    disabled={state.disabled}
                  />
                  <Label htmlFor="r-a" className="font-mono text-sm">
                    Mode A
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="b"
                    id="r-b"
                    disabled={state.disabled}
                  />
                  <Label htmlFor="r-b" className="font-mono text-sm">
                    Mode B
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="c"
                    id="r-c"
                    disabled={state.disabled}
                  />
                  <Label htmlFor="r-c" className="font-mono text-sm">
                    Mode C
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-mono text-accent">
                Inline Options
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroup defaultValue="x" orientation="horizontal">
                    <RadioGroupItem
                      value="x"
                      id="r-x"
                      disabled={state.disabled}
                    />
                  </RadioGroup>
                  <Label htmlFor="r-x" className="font-mono text-sm">
                    Option X
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroup defaultValue="y" orientation="horizontal">
                    <RadioGroupItem
                      value="y"
                      id="r-y"
                      disabled={state.disabled}
                    />
                  </RadioGroup>
                  <Label htmlFor="r-y" className="font-mono text-sm">
                    Option Y
                  </Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'accordion':
        return (
          <div className="space-y-4">
            <Accordion
              type="single"
              collapsible
              defaultValue={state.active ? 'item-1' : undefined}
            >
              <AccordionItem value="item-1" className={stateClasses.join(' ')}>
                <AccordionTrigger disabled={state.disabled}>
                  {state.loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading System Information...
                    </span>
                  ) : state.disabled ? (
                    <span className="flex items-center gap-2">
                      <X className="w-4 h-4" />
                      System Access Denied
                    </span>
                  ) : (
                    <>&gt; Terminal System Status</>
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 font-mono text-sm">
                    <p className="text-accent">System: ONLINE</p>
                    <p className="text-foreground">Memory: 2048MB Available</p>
                    <p className="text-foreground">Processes: 42 Active</p>
                    <p className="text-terminal-dim">
                      Last Boot: 2024-01-15 14:32:07
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>&gt; Network Configuration</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 font-mono text-sm">
                    <p className="text-accent">Connection: SECURE</p>
                    <p className="text-foreground">IP Address: 192.168.1.42</p>
                    <p className="text-foreground">Port Status: 8080 OPEN</p>
                    <p className="text-terminal-dim">Encryption: AES-256</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>&gt; User Permissions</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 font-mono text-sm">
                    <p className="text-accent">Access Level: ROOT</p>
                    <p className="text-foreground">Sessions: 1 Active</p>
                    <p className="text-foreground">Last Login: Just now</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-accent" />
                        <span>Read/Write Access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-accent" />
                        <span>System Administration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <X className="w-3 h-3 text-muted-foreground" />
                        <span>Hardware Debug Mode</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        );

      default:
        return (
          <div className="p-4 terminal-border">
            <p>Component preview not implemented for: {item.id}</p>
          </div>
        );
    }
  };

  return (
    <Card className="terminal-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-mono text-accent amber-glow">
              {item.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {item.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={item.hasInteractiveDemo ? 'default' : 'secondary'}>
              {item.hasInteractiveDemo ? 'Interactive' : 'Static'}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {item.states.length} states
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 terminal-form">
        {/* State Selector */}
        {item.states.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm font-mono text-accent">
              Component State ({selectedStateIndex + 1} of {item.states.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {item.states.map((state, index) => (
                <Button
                  key={createStateId(item.id, state)}
                  variant={index === selectedStateIndex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStateIndex(index)}
                  className="font-mono text-xs"
                >
                  {state.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Component Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-mono amber-glow">
            Terminal Component Preview
          </Label>
          {renderComponent()}
        </div>

        {/* State Info */}
        <div className="text-xs text-muted-foreground font-mono border-t border-border pt-4">
          <div className="flex flex-wrap gap-4">
            <span>State: {currentState.name}</span>
            {currentState.variant && (
              <span>Variant: {currentState.variant}</span>
            )}
            {currentState.size && <span>Size: {currentState.size}</span>}
            {currentState.disabled && <span>Disabled: Yes</span>}
            {currentState.loading && <span>Loading: Yes</span>}
            {currentState.active && <span>Active: Yes</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
